import { notFound } from "next/navigation";
import { Box, Flex } from "@bigcommerce/big-design";
import { ArrowBackIcon } from "@bigcommerce/big-design-icons";
import { AppLink } from "@/components/ui/app-link";
import { GiftCertificateTabs } from "@/components/gift-certs-manager/gift-certificates/detail/gift-certificate-tabs";
import { fetchGiftCertificate } from "@/lib/gift-certs-manager/gift-certificates/gift-certificates-api";
import { getAppUrl } from "@/lib/routing/app-url";
import { AppError } from "@/lib/errors/app-error";

export async function GiftCertificateView({
  id,
  storeHash,
}: {
  id: string;
  storeHash: string | undefined;
}) {
  // A missing id is a real 404 from BigCommerce's v2 single-resource
  // endpoint; the translation to notFound() happens here rather than in
  // fetchGiftCertificate, which is also called from Server Actions where a
  // 404 navigation would be wrong.
  let giftCertificate;

  try {
    giftCertificate = await fetchGiftCertificate(id, storeHash);
  } catch (error) {
    if (error instanceof AppError && error.status === 404) {
      notFound();
    }

    throw error;
  }

  return (
    <Box>
      <Box marginBottom="medium">
        <AppLink href={getAppUrl(storeHash, "/gift-certs")}>
          <Flex alignItems="center" flexGap="0.25rem">
            <ArrowBackIcon size="small" />
            Back to Gift Certificates
          </Flex>
        </AppLink>
      </Box>

      <GiftCertificateTabs giftCertificate={giftCertificate} storeHash={storeHash} />
    </Box>
  );
}
