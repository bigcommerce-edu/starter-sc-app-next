import { getApiClient } from "@/lib/api-client/get-api-client";
import { GIFT_CERTIFICATES_PATH, GiftCertificatesQuery, GiftCertificatesResult } from "@/lib/gift-certificates/types";

// Domain-level adapter: translates a GiftCertificatesQuery into the request
// shape the gift certificates endpoint expects, and delegates to whichever
// ApiClient DATA_MODE has selected (mock today, a real BigCommerce request
// once STATIC/MULTITENANT clients exist).
export async function fetchGiftCertificates(query: GiftCertificatesQuery): Promise<GiftCertificatesResult> {
  const apiClient = getApiClient();

  return apiClient.get<GiftCertificatesResult>(GIFT_CERTIFICATES_PATH, {
    params: {
      q: query.searchTerm,
      sort: query.sortColumnHash,
      direction: query.sortDirection,
      page: query.currentPage,
      perPage: query.itemsPerPage,
    },
  });
}
