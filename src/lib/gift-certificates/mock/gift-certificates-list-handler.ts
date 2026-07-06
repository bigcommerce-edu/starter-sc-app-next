import { MockRouteHandler } from "@/lib/api-client/mock-client/types";
import { ApiRequestParams } from "@/lib/api-client/types";
import { mockGiftCertificates } from "@/lib/gift-certificates/mock/mock-gift-certificates";
import { GIFT_CERTIFICATES_PATH, GiftCertificate } from "@/lib/gift-certificates/types";

// Mirrors the shape a real gift certificates list endpoint would return:
// a page of records plus the total count matching the filters.
export interface MockGiftCertificatesResponse {
  items: GiftCertificate[];
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

function handleGiftCertificatesListRequest(params: ApiRequestParams): MockGiftCertificatesResponse {
  const searchTerm = getStringParam(params, "q").trim().toLowerCase();
  const sortColumnHash = getStringParam(params, "sort") || "purchaseDate";
  const sortDirection = getStringParam(params, "direction") === "ASC" ? "ASC" : "DESC";
  const currentPage = getNumberParam(params, "page", 1);
  const itemsPerPage = getNumberParam(params, "perPage", 10);

  const filtered = searchTerm
    ? mockGiftCertificates.filter((certificate) =>
        [certificate.certificateNumber, certificate.recipientName, certificate.recipientEmail].some((field) =>
          field.toLowerCase().includes(searchTerm),
        ),
      )
    : mockGiftCertificates;

  const sortKey = sortColumnHash as keyof GiftCertificate;
  const sorted = [...filtered].sort((a, b) => {
    const aValue = a[sortKey];
    const bValue = b[sortKey];

    if (typeof aValue === "number" && typeof bValue === "number") {
      return sortDirection === "ASC" ? aValue - bValue : bValue - aValue;
    }

    const comparison = String(aValue).localeCompare(String(bValue));

    return sortDirection === "ASC" ? comparison : -comparison;
  });

  const startIndex = (currentPage - 1) * itemsPerPage;
  const items = sorted.slice(startIndex, startIndex + itemsPerPage);

  return { items, totalItems: sorted.length };
}

export const giftCertificatesListMockHandler: MockRouteHandler = {
  pattern: new RegExp(`^${GIFT_CERTIFICATES_PATH}$`),
  handle: (_match, params) => handleGiftCertificatesListRequest(params),
};
