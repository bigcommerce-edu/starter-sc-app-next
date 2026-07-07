import { getApiClient } from "@/lib/api-client/get-api-client";
import {
  GIFT_CERTIFICATES_PATH,
  GiftCertificate,
  GiftCertificatesQuery,
  GiftCertificatesResult,
  getGiftCertificatePath,
} from "@/lib/gift-certificates/types";

// Domain-level adapter: translates a GiftCertificatesQuery into the request
// shape the gift certificates endpoint expects, and delegates to whichever
// ApiClient DATA_MODE has selected (mock today, a real BigCommerce request
// once STATIC/MULTITENANT clients exist).
export async function fetchGiftCertificates(query: GiftCertificatesQuery): Promise<GiftCertificatesResult> {
  const apiClient = getApiClient();

  return apiClient.get<GiftCertificatesResult>(GIFT_CERTIFICATES_PATH, {
    params: {
      certificateNumber: query.certificateNumber,
      status: query.status.join(","),
      balanceMin: query.balanceMin,
      balanceMax: query.balanceMax,
      recipientName: query.recipientName,
      recipientEmail: query.recipientEmail,
      purchasedAfter: query.purchasedAfter,
      purchasedBefore: query.purchasedBefore,
      sort: query.sortColumnHash,
      direction: query.sortDirection,
      page: query.currentPage,
      perPage: query.itemsPerPage,
    },
  });
}

export async function fetchGiftCertificate(id: number | string): Promise<GiftCertificate> {
  const apiClient = getApiClient();

  return apiClient.get<GiftCertificate>(getGiftCertificatePath(id));
}
