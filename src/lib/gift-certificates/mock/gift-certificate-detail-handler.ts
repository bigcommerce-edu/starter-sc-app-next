import { MockRouteHandler } from "@/lib/api-client/mock-client/types";
import { mockGiftCertificates } from "@/lib/gift-certificates/mock/mock-gift-certificates";
import { GIFT_CERTIFICATES_PATH, GiftCertificate } from "@/lib/gift-certificates/types";

function handleGiftCertificateDetailRequest(id: string): GiftCertificate {
  const certificate = mockGiftCertificates.find((item) => String(item.id) === id);

  if (!certificate) {
    throw new Error(`No gift certificate found with id "${id}".`);
  }

  return certificate;
}

export const giftCertificateDetailMockHandler: MockRouteHandler = {
  pattern: new RegExp(`^${GIFT_CERTIFICATES_PATH}/([^/]+)$`),
  handle: (match) => handleGiftCertificateDetailRequest(match[1]),
};
