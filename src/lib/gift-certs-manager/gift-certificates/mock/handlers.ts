import { giftCertificateDetailMockHandler } from "@/lib/gift-certs-manager/gift-certificates/mock/gift-certificate-detail-handler";
import { giftCertificatesListMockHandler } from "@/lib/gift-certs-manager/gift-certificates/mock/gift-certificates-list-handler";
import { MockRouteHandler } from "@/lib/bc-api-client/mock-client/types";

// The list of mock handlers this feature contributes to MockRestApiClient.
// Delete this file's import from handler-registry.ts to drop gift
// certificates out of the mock client entirely.
export const giftCertificatesMockHandlers: MockRouteHandler[] = [
  giftCertificateDetailMockHandler,
  giftCertificatesListMockHandler,
];
