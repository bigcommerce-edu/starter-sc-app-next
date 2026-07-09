import { MockRouteHandler } from "@/lib/api-client/mock-client/types";
import { ApiRequestParams } from "@/lib/api-client/types";
import { GiftCertificateWireRecord } from "@/lib/gift-certs-manager/gift-certificates/gift-certificates-api";
import { mockGiftCertificates } from "@/lib/gift-certs-manager/gift-certificates/mock/mock-gift-certificates";
import { GIFT_CERTIFICATES_PATH } from "@/lib/gift-certs-manager/gift-certificates/types";

// Mirrors the shape a real gift certificates list endpoint would return: a
// page of records plus the total count. Real BigCommerce v2 endpoints report
// the total via Link/X-Total-Count response headers rather than a body
// field — this mock keeps the count in the body since ApiClient doesn't
// expose headers, but that's a mock-only convenience, not a real API shape.
export interface MockGiftCertificatesResponse {
  items: GiftCertificateWireRecord[];
  totalItems: number;
}

function getStringParam(params: ApiRequestParams, key: string): string {
  const value = params[key];

  return typeof value === "string" ? value : "";
}

function getNumberParam(params: ApiRequestParams, key: string, fallback: number): number {
  const value = Number(params[key]);

  return Number.isInteger(value) && value > 0 ? value : fallback;
}

// BigCommerce's v2 gift certificates endpoint only supports flat equality
// filters on these fields (code, to_name, to_email, from_name, from_email)
// and sorting by id — no balance/date ranges, no status filter, no
// arbitrary-column sort.
function handleGiftCertificatesListRequest(params: ApiRequestParams): MockGiftCertificatesResponse {
  const code = getStringParam(params, "code").trim().toLowerCase();
  const toName = getStringParam(params, "to_name").trim().toLowerCase();
  const toEmail = getStringParam(params, "to_email").trim().toLowerCase();
  const fromName = getStringParam(params, "from_name").trim().toLowerCase();
  const fromEmail = getStringParam(params, "from_email").trim().toLowerCase();
  const direction = getStringParam(params, "direction") === "asc" ? "asc" : "desc";
  const currentPage = getNumberParam(params, "page", 1);
  const itemsPerPage = getNumberParam(params, "limit", 10);

  const filtered = mockGiftCertificates.filter((certificate) => {
    if (code && !certificate.code.toLowerCase().includes(code)) {
      return false;
    }

    if (toName && !certificate.to_name.toLowerCase().includes(toName)) {
      return false;
    }

    if (toEmail && !certificate.to_email.toLowerCase().includes(toEmail)) {
      return false;
    }

    if (fromName && !certificate.from_name.toLowerCase().includes(fromName)) {
      return false;
    }

    if (fromEmail && !certificate.from_email.toLowerCase().includes(fromEmail)) {
      return false;
    }

    return true;
  });

  const sorted = [...filtered].sort((a, b) => (direction === "asc" ? a.id - b.id : b.id - a.id));

  const startIndex = (currentPage - 1) * itemsPerPage;
  const items = sorted.slice(startIndex, startIndex + itemsPerPage);

  return { items, totalItems: sorted.length };
}

export const giftCertificatesListMockHandler: MockRouteHandler = {
  pattern: new RegExp(`^${GIFT_CERTIFICATES_PATH}$`),
  handle: (_match, params) => handleGiftCertificatesListRequest(params),
};
