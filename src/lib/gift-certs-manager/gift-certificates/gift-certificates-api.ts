import { ApiClient } from "@/lib/api-client/types";
import { getApiClient } from "@/lib/api-client/get-api-client";
import { StoreCredentials } from "@/lib/api-client/store-credentials";
import {
  GIFT_CERTIFICATES_PATH,
  GiftCertificate,
  GiftCertificatesQuery,
  GiftCertificatesResult,
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
