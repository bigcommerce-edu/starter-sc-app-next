import { cacheLife, cacheTag } from "next/cache";
import { ArrowBackIcon, Box, Flex, Link } from "@/components/ui/big-design";
import { GiftCertificateTabs } from "@/components/gift-certs-manager/gift-certificates/detail/gift-certificate-tabs";
import { StoreCredentials } from "@/lib/api-client/store-credentials";
import { decorateGiftCertificateWithAccounts } from "@/lib/gift-certs-manager/gift-certificates/decorate-with-accounts";
import { giftCertificateTag } from "@/lib/gift-certs-manager/gift-certificates/cache-tags";
import { fetchGiftCertificate } from "@/lib/gift-certs-manager/gift-certificates/gift-certificates-api";
import { getAppUrl } from "@/lib/routing/app-url";

// Tagged per-id (rather than the shared list tag) so the detail page's
// action layer can invalidate exactly the certificate it just mutated and
// have the change show up immediately, without waiting out the cacheLife or
// invalidating every other certificate's cached detail view. `use cache`
// wraps the whole rendered view, so a cache hit skips re-rendering
// GiftCertificateTabs (and everything under it) too.
export async function GiftCertificateView({
  id,
  urlStoreHash,
  apiCredentials,
}: {
  id: string;
  urlStoreHash: string | undefined;
  apiCredentials: StoreCredentials;
}) {
  "use cache";
  cacheLife("standard");
  cacheTag(giftCertificateTag(id));

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

      <GiftCertificateTabs giftCertificate={giftCertificate} urlStoreHash={urlStoreHash} />
    </Box>
  );
}
