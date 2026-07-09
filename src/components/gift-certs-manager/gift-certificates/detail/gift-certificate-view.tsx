import { ArrowBackIcon, Box, Flex, Link } from "@/components/ui/big-design";
import { GiftCertificateTabs } from "@/components/gift-certs-manager/gift-certificates/detail/gift-certificate-tabs";
import { StoreCredentials } from "@/lib/api-client/store-credentials";
import { decorateGiftCertificateWithAccounts } from "@/lib/gift-certs-manager/gift-certificates/decorate-with-accounts";
import { fetchGiftCertificate } from "@/lib/gift-certs-manager/gift-certificates/gift-certificates-api";
import { getAppUrl } from "@/lib/routing/app-url";

export async function GiftCertificateView({
  id,
  urlStoreHash,
  apiCredentials,
}: {
  id: string;
  urlStoreHash: string | undefined;
  apiCredentials: StoreCredentials;
}) {
  const giftCertificate = await decorateGiftCertificateWithAccounts(
    await fetchGiftCertificate(id, apiCredentials),
    apiCredentials,
  );

  return (
    <Box>
      <Box marginBottom="medium">
        <Link href={getAppUrl(urlStoreHash, "/gift-certs")}>
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
