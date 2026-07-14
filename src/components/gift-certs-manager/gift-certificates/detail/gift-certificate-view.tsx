import { Box, Flex, Link } from "@/components/ui/big-design";
import { ArrowBackIcon } from "@/components/ui/big-design-icons";
import { GiftCertificateTabs } from "@/components/gift-certs-manager/gift-certificates/detail/gift-certificate-tabs";
import { decorateGiftCertificateWithAccounts } from "@/lib/gift-certs-manager/gift-certificates/decorate-with-accounts";
import { fetchGiftCertificate } from "@/lib/gift-certs-manager/gift-certificates/gift-certificates-api";
import { getAppUrl } from "@/lib/routing/app-url";

export async function GiftCertificateView({ id, storeHash }: { id: string; storeHash: string | undefined }) {
  const giftCertificate = await decorateGiftCertificateWithAccounts(await fetchGiftCertificate(id));

  return (
    <Box>
      <Box marginBottom="medium">
        <Link href={getAppUrl(storeHash, "/gift-certs")}>
          <Flex alignItems="center" flexGap="0.25rem">
            <ArrowBackIcon size="small" />
            Back to Gift Certificates
          </Flex>
        </Link>
      </Box>

      <GiftCertificateTabs giftCertificate={giftCertificate} />
    </Box>
  );
}
