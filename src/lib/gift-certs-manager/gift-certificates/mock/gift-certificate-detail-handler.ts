import { MockRouteHandler, MockRouteResponse } from "@/lib/api-client/mock-client/types";
import { GiftCertificateWireRecord } from "@/lib/gift-certs-manager/gift-certificates/gift-certificates-api";
import { mockGiftCertificates } from "@/lib/gift-certs-manager/gift-certificates/mock/mock-gift-certificates";
import { GIFT_CERTIFICATES_PATH } from "@/lib/gift-certs-manager/gift-certificates/types";

function handleGiftCertificateDetailRequest(id: string): GiftCertificateWireRecord {
  const certificate = mockGiftCertificates.find((item) => String(item.id) === id);

  if (!certificate) {
    throw new Error(`No gift certificate found with id "${id}".`);
  }

  return certificate;
}

export const giftCertificateDetailMockHandler: MockRouteHandler = {
  pattern: new RegExp(`^${GIFT_CERTIFICATES_PATH}/([^/]+)$`),
  handle: (match): MockRouteResponse => ({ data: handleGiftCertificateDetailRequest(match[1]) }),
};
