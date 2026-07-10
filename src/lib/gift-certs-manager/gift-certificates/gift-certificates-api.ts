import { ApiClient } from "@/lib/api-client/types";
import { getApiClient } from "@/lib/api-client/get-api-client";
import { StoreCredentials } from "@/lib/api-client/store-credentials";
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

async function fetchGiftCertificatesPage(
  apiClient: ApiClient,
  query: GiftCertificatesQuery,
): Promise<GiftCertificateWireRecord[]> {
  const { data: items } = await apiClient.get<GiftCertificateWireRecord[]>(GIFT_CERTIFICATES_PATH, {
    params: {
      ...query,
      sort: "id",
      direction: query.direction.toLowerCase(),
    },
  });

  return items;
}

// BigCommerce's v2 gift certificates endpoint reports no total count
// anywhere (not in the body, not in a header) — the only way to know if
// there's another page is to ask for it. A full page (items.length === limit)
// means there might be more, so peek at page + 1 with a limit of 1 to find
// out for sure. This is all the table's stateless pagination needs: whether
// to enable "next", not how many pages exist in total.
// TODO: once server-side response caching lands, this peek request becomes
// effectively free on repeat navigations to the same page.
async function resolveHasNextPage(
  apiClient: ApiClient,
  query: GiftCertificatesQuery,
  items: GiftCertificateWireRecord[],
): Promise<boolean> {
  if (items.length < query.limit) {
    return false;
  }

  const nextPage = await fetchGiftCertificatesPage(apiClient, { ...query, page: query.page + 1, limit: 1 });

  return nextPage.length > 0;
}

// Domain-level adapter: query already matches the request shape field for
// field, so the only translation needed is lowercasing direction to match
// the wire's asc/desc.
export async function fetchGiftCertificates(
  query: GiftCertificatesQuery,
  apiCredentials: StoreCredentials,
): Promise<GiftCertificatesResult> {
  const apiClient = getApiClient(apiCredentials);
  const items = await fetchGiftCertificatesPage(apiClient, query);
  const hasNextPage = await resolveHasNextPage(apiClient, query, items);

  return { items: items.map(parseGiftCertificate), hasNextPage };
}

export async function fetchGiftCertificate(
  id: number | string,
  apiCredentials: StoreCredentials,
): Promise<GiftCertificate> {
  const apiClient = getApiClient(apiCredentials);
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
  apiCredentials: StoreCredentials,
): Promise<GiftCertificate> {
  const apiClient = getApiClient(apiCredentials);
  const { data: record } = await apiClient.put<GiftCertificateWireRecord>(getGiftCertificatePath(giftCertificate.id), {
    body: { ...getRequiredFields(giftCertificate), ...fields },
  });

  return parseGiftCertificate(record);
}

export async function updateGiftCertificateStatus(
  giftCertificate: GiftCertificate,
  status: GiftCertificateStatus,
  apiCredentials: StoreCredentials,
): Promise<GiftCertificate> {
  return updateGiftCertificate(giftCertificate, { status }, apiCredentials);
}

// Refilling always (re-)activates the certificate — the caller (the action
// layer) has already confirmed status was active/expired going in, and a
// refill of a previously-expired certificate should make it usable again.
export async function refillGiftCertificateBalance(
  giftCertificate: GiftCertificate,
  newBalance: number,
  apiCredentials: StoreCredentials,
): Promise<GiftCertificate> {
  return updateGiftCertificate(
    giftCertificate,
    { balance: String(newBalance), status: "active" },
    apiCredentials,
  );
}

// Adding to balance always (re-)activates the certificate, same as refilling
// — the caller has already confirmed status was active/expired going in.
// Unlike refilling, the resulting balance is never capped at the original
// amount (the caller doesn't validate that here either).
export async function addToGiftCertificateBalance(
  giftCertificate: GiftCertificate,
  amount: number,
  apiCredentials: StoreCredentials,
): Promise<GiftCertificate> {
  return updateGiftCertificate(
    giftCertificate,
    { balance: String(giftCertificate.balance + amount), status: "active" },
    apiCredentials,
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
  apiCredentials: StoreCredentials,
): Promise<GiftCertificate> {
  const newBalance = giftCertificate.balance - amount;

  return updateGiftCertificate(
    giftCertificate,
    { balance: String(newBalance), status: newBalance <= 0 ? "expired" : giftCertificate.status },
    apiCredentials,
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
  apiCredentials: StoreCredentials,
): Promise<GiftCertificate> {
  return updateGiftCertificate(
    giftCertificate,
    { balance: String(previousBalance), status: previousStatus },
    apiCredentials,
  );
}
