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

function getOptionalNumberParam(params: ApiRequestParams, key: string): number | undefined {
  const value = params[key];

  return value === undefined || value === "" ? undefined : Number(value);
}

function handleGiftCertificatesListRequest(params: ApiRequestParams): MockGiftCertificatesResponse {
  const certificateNumber = getStringParam(params, "certificateNumber").trim().toLowerCase();
  const statuses = getStringParam(params, "status")
    .split(",")
    .filter((value) => value !== "");
  const balanceMin = getOptionalNumberParam(params, "balanceMin");
  const balanceMax = getOptionalNumberParam(params, "balanceMax");
  const recipientName = getStringParam(params, "recipientName").trim().toLowerCase();
  const recipientEmail = getStringParam(params, "recipientEmail").trim().toLowerCase();
  const purchasedAfter = getStringParam(params, "purchasedAfter");
  const purchasedBefore = getStringParam(params, "purchasedBefore");
  const sortColumnHash = getStringParam(params, "sort") || "purchaseDate";
  const sortDirection = getStringParam(params, "direction") === "ASC" ? "ASC" : "DESC";
  const currentPage = getNumberParam(params, "page", 1);
  const itemsPerPage = getNumberParam(params, "perPage", 10);

  const filtered = mockGiftCertificates.filter((certificate) => {
    if (certificateNumber && !certificate.certificateNumber.toLowerCase().includes(certificateNumber)) {
      return false;
    }

    if (statuses.length > 0 && !statuses.includes(certificate.status)) {
      return false;
    }

    if (balanceMin !== undefined && certificate.currentBalance < balanceMin) {
      return false;
    }

    if (balanceMax !== undefined && certificate.currentBalance > balanceMax) {
      return false;
    }

    if (recipientName && !certificate.recipientName.toLowerCase().includes(recipientName)) {
      return false;
    }

    if (recipientEmail && !certificate.recipientEmail.toLowerCase().includes(recipientEmail)) {
      return false;
    }

    if (purchasedAfter && certificate.purchaseDate < purchasedAfter) {
      return false;
    }

    if (purchasedBefore && certificate.purchaseDate > purchasedBefore) {
      return false;
    }

    return true;
  });

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
