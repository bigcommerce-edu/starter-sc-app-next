import { getApiClient } from "@/lib/api-client/get-api-client";
import {
  GIFT_CERTIFICATES_PATH,
  GiftCertificate,
  GiftCertificatesQuery,
  GiftCertificatesResult,
  getGiftCertificatePath,
} from "@/lib/gift-certificates/types";

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

// BigCommerce v2 list endpoints return a bare array and communicate the
// total count via the Link/X-Total-Count response headers rather than a
// body field — ApiClient doesn't expose headers today, so the mock client
// (see mock/gift-certificates-list-handler.ts) reports totalItems out of
// band via a header the real STATIC/MULTITENANT client would need to read.
interface GiftCertificatesApiResponse {
  items: GiftCertificateWireRecord[];
  totalItems: number;
}

// Domain-level adapter: query already matches the request shape field for
// field, so the only translation needed is lowercasing direction to match
// the wire's asc/desc.
export async function fetchGiftCertificates(query: GiftCertificatesQuery): Promise<GiftCertificatesResult> {
  const apiClient = getApiClient();

  const response = await apiClient.get<GiftCertificatesApiResponse>(GIFT_CERTIFICATES_PATH, {
    params: {
      ...query,
      sort: "id",
      direction: query.direction.toLowerCase(),
    },
  });

  return { items: response.items.map(parseGiftCertificate), totalItems: response.totalItems };
}

export async function fetchGiftCertificate(id: number | string): Promise<GiftCertificate> {
  const apiClient = getApiClient();
  const record = await apiClient.get<GiftCertificateWireRecord>(getGiftCertificatePath(id));

  return parseGiftCertificate(record);
}
