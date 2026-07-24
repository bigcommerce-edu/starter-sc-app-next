import { cacheLife, cacheTag } from "next/cache";
import { notFound } from "next/navigation";
import { Box, Flex } from "@/components/ui/big-design";
import { ArrowBackIcon } from "@/components/ui/big-design-icons";
import { AppLink } from "@/components/ui/app-link";
import { GiftCertificateTabs } from "@/components/gift-certs-manager/gift-certificates/detail/gift-certificate-tabs";
import { decorateGiftCertificateWithAccounts } from "@/lib/gift-certs-manager/gift-certificates/decorate-with-accounts";
import { giftCertificateTag } from "@/lib/gift-certs-manager/gift-certificates/cache-tags";
import { fetchGiftCertificate } from "@/lib/gift-certs-manager/gift-certificates/gift-certificates-api";
import { getAppUrl } from "@/lib/routing/app-url";
import { AppError } from "@/lib/errors/app-error";

// Tagged per-id (rather than the shared list tag) so the detail page's
// action layer can invalidate exactly the certificate it just mutated and
// have the change show up immediately, without waiting out the cacheLife or
// invalidating every other certificate's cached detail view. `use cache`
// wraps the whole rendered view, so a cache hit skips re-rendering
// GiftCertificateTabs (and everything under it) too. storeHash is the raw
// [storeHash] route param (or undefined on a root-level dev route) — a
// plain, serializable string, so it's safe to cross this cache boundary.
// It's used both for data-access calls (getRestApiClient resolves which store to
// actually target internally) and for building URLs further down.
export async function GiftCertificateView({
  id,
  storeHash,
}: {
  id: string;
  storeHash: string | undefined;
}) {
  "use cache: remote";
  cacheLife("standard");
  cacheTag(giftCertificateTag(id));

  // A missing id is a real 404 from BigCommerce's v2 single-resource
  // endpoint (see fetchGiftCertificate's own comment on why the 404-to-404
  // translation happens here rather than in that shared function) —
  // notFound() is safe to call from inside this "use cache: remote"
  // boundary (verified against Next's own error-handling source: its
  // digest survives the cache wrapper's error handler unmodified, the same
  // path a plain page-level notFound() call takes).
  let rawGiftCertificate;

  try {
    rawGiftCertificate = await fetchGiftCertificate(id, storeHash);
  } catch (error) {
    if (error instanceof AppError && error.status === 404) {
      notFound();
    }

    throw error;
  }

  const giftCertificate = await decorateGiftCertificateWithAccounts(rawGiftCertificate, storeHash);

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
