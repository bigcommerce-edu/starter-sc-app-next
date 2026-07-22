import { cacheLife, cacheTag } from "next/cache";
import { getRestApiClient } from "@/lib/bc-api-client/get-rest-api-client";
import { giftCertificateTag, GIFT_CERTIFICATES_LIST_TAG } from "@/lib/gift-certs-manager/gift-certificates/cache-tags";
import {
  GIFT_CERTIFICATES_PATH,
  GiftCertificate,
  GiftCertificatesQuery,
  GiftCertificatesResult,
  GiftCertificateStatus,
  getGiftCertificatePath,
} from "@/lib/gift-certs-manager/gift-certificates/types";

// BigCommerce returns amount/balance as decimal strings on the wire; every
// other numeric-looking field is already a number. This is the only
// conversion needed to match the GiftCertificate shape.
export interface GiftCertificateWireRecord extends Omit<GiftCertificate, "amount" | "balance"> {
  amount: string;
  balance: string;
}

function parseGiftCertificate(record: GiftCertificateWireRecord): GiftCertificate {
  return { ...record, amount: Number(record.amount), balance: Number(record.balance) };
}

// Cached on its own (not just at the calling *View's render boundary) because
// resolveHasNextPage below peeks ahead at the next page using this exact same
// function with the next page's own query — tagging/caching it here means
// that peek is a real, reusable cache entry: if the user actually clicks
// "next," fetchGiftCertificates's own call to this function for that page
// hits this same cache entry instead of re-fetching. This only works because
// the peek uses the real page limit (see resolveHasNextPage) rather than a
// smaller probe size — a probe with a different limit would produce a
// different cache key and never be reused by the real navigation.
async function fetchGiftCertificatesPage(
  query: GiftCertificatesQuery,
  storeHash: string | undefined,
): Promise<GiftCertificateWireRecord[]> {
  "use cache: remote";
  cacheLife("standard");
  cacheTag(GIFT_CERTIFICATES_LIST_TAG);

  const apiClient = await getRestApiClient(storeHash);
  const { data: items } = await apiClient.get<GiftCertificateWireRecord[]>(GIFT_CERTIFICATES_PATH, {
    params: {
      ... (query.code && { "code": query.code }),
      ... (query.to_name && { "to_name": query.to_name }),
      ... (query.to_email && { "to_email": query.to_email }),
      sort: "id",
      direction: query.direction.toLowerCase(),
      page: query.page,
      limit: query.limit,
    },
  });

  // BigCommerce's v2 gift certificates endpoint responds 204 No Content
  // (rather than 200 with an empty array) when nothing matches the query —
  // BcRestApiClient.get returns undefined for a 204, so treat that the same as [].
  const records = items ?? [];

  // Same reasoning as GiftCertificateListView: beyond the shared list tag,
  // tag this cache entry with every certificate id actually present in the
  // result set (added after the fetch resolves, since the ids aren't known
  // before then — the documented "creating tags from external data"
  // cacheTag pattern), so a mutation to one of these certificates
  // invalidates this page/peek immediately rather than waiting out the
  // cacheLife.
  for (const record of records) {
    cacheTag(giftCertificateTag(record.id));
  }

  return records;
}

// BigCommerce's v2 gift certificates endpoint reports no total count
// anywhere (not in the body, not in a header) — the only way to know if
// there's another page is to ask for it. A full page (items.length === limit)
// means there might be more, so peek at page + 1 — using the same limit as
// the current page, not just enough to detect presence — so the peek's
// cache entry (see fetchGiftCertificatesPage) is identical to, and therefore
// reusable by, the real fetch that happens if the user actually navigates to
// that next page. This is all the table's stateless pagination needs:
// whether to enable "next", not how many pages exist in total.
async function resolveHasNextPage(
  query: GiftCertificatesQuery,
  storeHash: string | undefined,
  items: GiftCertificateWireRecord[],
): Promise<boolean> {
  if (items.length < query.limit) {
    return false;
  }

  const nextPage = await fetchGiftCertificatesPage({ ...query, page: query.page + 1 }, storeHash);

  return nextPage.length > 0;
}

// Domain-level adapter: query already matches the request shape field for
// field, so the only translation needed is lowercasing direction to match
// the wire's asc/desc. The outer *View component (see
// GiftCertificateListView/CustomerView) caches its whole rendered output,
// but fetchGiftCertificatesPage also caches itself independently — see its
// comment for why.
export async function fetchGiftCertificates(
  query: GiftCertificatesQuery,
  storeHash: string | undefined,
): Promise<GiftCertificatesResult> {
  const items = await fetchGiftCertificatesPage(query, storeHash);
  const hasNextPage = await resolveHasNextPage(query, storeHash, items);

  return { items: items.map(parseGiftCertificate), hasNextPage };
}

// See fetchGiftCertificates — caching lives in the calling *View component
// (GiftCertificateView), not here.
export async function fetchGiftCertificate(
  id: number | string,
  storeHash: string | undefined,
): Promise<GiftCertificate> {
  const apiClient = await getRestApiClient(storeHash);
  const { data: record } = await apiClient.get<GiftCertificateWireRecord>(getGiftCertificatePath(id));

  return parseGiftCertificate(record);
}

// BigCommerce's v2 PUT is a full-object replacement rather than a partial
// patch, but to_name/to_email/from_name/from_email/amount are the only
// fields it actually requires on every request — everything else only needs
// to be included when that's the field actually being changed. Pulling these
// off the existing certificate (rather than sending the whole object) means
// each update function below only has to name the field(s) it's changing.
function getRequiredFields(giftCertificate: GiftCertificate): Pick<
  GiftCertificateWireRecord,
  "to_name" | "to_email" | "from_name" | "from_email" | "amount"
> {
  return {
    to_name: giftCertificate.to_name,
    to_email: giftCertificate.to_email,
    from_name: giftCertificate.from_name,
    from_email: giftCertificate.from_email,
    amount: String(giftCertificate.amount),
  };
}

// Shared by every gift certificate update — callers pass only the field(s)
// they're actually changing (e.g. { status } or { balance }), and this fills
// in the required fields from the certificate's current state.
async function updateGiftCertificate(
  giftCertificate: GiftCertificate,
  fields: Partial<Omit<GiftCertificateWireRecord, "id">>,
  storeHash: string | undefined,
): Promise<GiftCertificate> {
  const apiClient = await getRestApiClient(storeHash);
  const { data: record } = await apiClient.put<GiftCertificateWireRecord>(getGiftCertificatePath(giftCertificate.id), {
    body: { ...getRequiredFields(giftCertificate), ...fields },
  });

  return parseGiftCertificate(record);
}

export async function updateGiftCertificateStatus(
  giftCertificate: GiftCertificate,
  status: GiftCertificateStatus,
  storeHash: string | undefined,
): Promise<GiftCertificate> {
  return updateGiftCertificate(giftCertificate, { status }, storeHash);
}

// Refilling always (re-)activates the certificate — the caller (the action
// layer) has already confirmed status was active/expired going in, and a
// refill of a previously-expired certificate should make it usable again.
export async function refillGiftCertificateBalance(
  giftCertificate: GiftCertificate,
  newBalance: number,
  storeHash: string | undefined,
): Promise<GiftCertificate> {
  return updateGiftCertificate(giftCertificate, { balance: String(newBalance), status: "active" }, storeHash);
}

// Adding to balance always (re-)activates the certificate, same as refilling
// — the caller has already confirmed status was active/expired going in.
// Unlike refilling, the resulting balance is never capped at the original
// amount (the caller doesn't validate that here either).
export async function addToGiftCertificateBalance(
  giftCertificate: GiftCertificate,
  amount: number,
  storeHash: string | undefined,
): Promise<GiftCertificate> {
  return updateGiftCertificate(
    giftCertificate,
    { balance: String(giftCertificate.balance + amount), status: "active" },
    storeHash,
  );
}

// Debits the certificate by exactly the amount being moved to store credit,
// and expires it once nothing is left to redeem — unlike refill/add-to-balance,
// this never (re-)activates a certificate, since transferring out is the
// opposite operation. This is only the certificate half of a transfer — see
// transferGiftCertificateBalanceToStoreCredit in actions.ts, which also
// grants the corresponding store credit and is the only place that name
// should mean "the whole transfer."
export async function debitGiftCertificateForTransfer(
  giftCertificate: GiftCertificate,
  amount: number,
  storeHash: string | undefined,
): Promise<GiftCertificate> {
  const newBalance = giftCertificate.balance - amount;

  return updateGiftCertificate(
    giftCertificate,
    { balance: String(newBalance), status: newBalance <= 0 ? "expired" : giftCertificate.status },
    storeHash,
  );
}

// Restores a certificate's balance/status exactly as they were before a
// transfer — used to compensate if the transfer's second step (granting
// store credit) fails after the certificate has already been debited. Takes
// the pre-transfer values explicitly (rather than re-deriving them) so the
// caller doesn't have to trust a second fetch to still reflect the original
// state.
export async function restoreGiftCertificateBalance(
  giftCertificate: GiftCertificate,
  previousBalance: number,
  previousStatus: GiftCertificateStatus,
  storeHash: string | undefined,
): Promise<GiftCertificate> {
  return updateGiftCertificate(
    giftCertificate,
    { balance: String(previousBalance), status: previousStatus },
    storeHash,
  );
}
