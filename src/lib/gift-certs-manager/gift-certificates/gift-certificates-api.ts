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

// Cached on its own (not just at the calling *View's render boundary)
// because resolveHasNextPage below peeks ahead at the next page using this
// same function — tagging/caching it here means a real "next" click reuses
// that peek's cache entry instead of re-fetching. See docs/ARCHITECTURE.md.
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

  // BigCommerce's v2 endpoint responds 204 (not 200 + []) when nothing
  // matches.
  const records = items ?? [];

  // Tag with every certificate id in the result (known only after the
  // fetch resolves), so a mutation to one invalidates this page/peek
  // immediately rather than waiting out the cacheLife.
  for (const record of records) {
    cacheTag(giftCertificateTag(record.id));
  }

  return records;
}

// BigCommerce's v2 endpoint reports no total count anywhere, so the only
// way to know if there's another page is to peek at page + 1, using the
// same limit (so the peek's cache entry is reusable by the real fetch if
// the user navigates there).
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

export async function fetchGiftCertificates(
  query: GiftCertificatesQuery,
  storeHash: string | undefined,
): Promise<GiftCertificatesResult> {
  const items = await fetchGiftCertificatesPage(query, storeHash);
  const hasNextPage = await resolveHasNextPage(query, storeHash, items);

  return { items: items.map(parseGiftCertificate), hasNextPage };
}

// Deliberately does not call notFound() on a 404 — shared by
// GiftCertificateView (a page render, where notFound() is right) and
// Server Actions (where a 404 means the certificate was deleted since page
// load, which should be an ActionResult failure, not a navigation). See
// GiftCertificateView for the 404-to-notFound() translation.
export async function fetchGiftCertificate(
  id: number | string,
  storeHash: string | undefined,
): Promise<GiftCertificate> {
  const apiClient = await getRestApiClient(storeHash);
  const { data: record } = await apiClient.get<GiftCertificateWireRecord>(getGiftCertificatePath(id));

  return parseGiftCertificate(record);
}

// BigCommerce's v2 PUT is a full-object replacement, but only these fields
// are required on every request — pulling them off the existing certificate
// means each update function below only has to name what's actually changing.
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

// Refilling always (re-)activates the certificate, making a previously
// expired one usable again.
export async function refillGiftCertificateBalance(
  giftCertificate: GiftCertificate,
  newBalance: number,
  storeHash: string | undefined,
): Promise<GiftCertificate> {
  return updateGiftCertificate(giftCertificate, { balance: String(newBalance), status: "active" }, storeHash);
}

// Same as refilling, but the resulting balance is never capped at the
// original amount.
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

// Debits the certificate and expires it once nothing is left to redeem —
// never (re-)activates it, unlike refill/add-to-balance. Only the
// certificate half of a transfer; see transferGiftCertificateBalanceToStoreCredit
// in actions.ts for the store-credit grant.
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

// Compensates a failed store-credit grant by restoring the certificate's
// pre-transfer balance/status, passed explicitly rather than re-derived.
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
