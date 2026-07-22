import { cacheLife, cacheTag } from "next/cache";
import { Box, Panel } from "@/components/ui/big-design";
import { ControlPanelLink } from "@/components/ui/control-panel-link";
import { GiftCertificateTable } from "@/components/gift-certs-manager/gift-certificates/list/gift-certificate-table";
import { decorateGiftCertificatesWithRecipientAccounts } from "@/lib/gift-certs-manager/gift-certificates/decorate-with-accounts";
import { giftCertificateTag, GIFT_CERTIFICATES_LIST_TAG } from "@/lib/gift-certs-manager/gift-certificates/cache-tags";
import { fetchGiftCertificates } from "@/lib/gift-certs-manager/gift-certificates/gift-certificates-api";
import { parseGiftCertificatesQuery } from "@/lib/gift-certs-manager/gift-certificates/query";

// The "standard" cacheLife (see next.config.ts) is enough to keep this
// reasonably fresh on its own, but a mutation to a certificate that's
// actually shown on this page should still update it immediately rather
// than wait out that lifetime — without invalidating every other cached
// listing page too. So beyond the shared list tag, this also tags the cache
// entry with every certificate id actually present in the result set (added
// after the fetch resolves, since the ids aren't known before then — this is
// the documented "creating tags from external data" cacheTag pattern). Every
// mutating action already calls updateTag(giftCertificateTag(id)) for the
// certificate it touched, so once tagged this way, only the listing pages
// that actually include that certificate get invalidated by it.
// `use cache` wraps the whole rendered view (not just the underlying fetch),
// so a cache hit skips re-rendering GiftCertificateTable too. storeHash is
// the raw [storeHash] route param (or undefined on a root-level dev route) —
// a plain, serializable string, so it's safe to cross this cache boundary.
// It's used both for data-access calls (getRestApiClient resolves which store to
// actually target internally) and for building URLs further down.
export async function GiftCertificateListView({
  searchParams,
  storeHash,
}: {
  searchParams: Record<string, string | string[] | undefined>;
  storeHash: string | undefined;
}) {
  "use cache: remote";
  cacheLife("standard");
  cacheTag(GIFT_CERTIFICATES_LIST_TAG);

  const query = parseGiftCertificatesQuery(searchParams);
  const { items, hasNextPage } = await fetchGiftCertificates(query, storeHash);

  for (const item of items) {
    cacheTag(giftCertificateTag(item.id));
  }

  const decoratedItems = await decorateGiftCertificatesWithRecipientAccounts(items, storeHash);

  return (
    <Panel header="Gift Certificates">
      <Box marginBottom="medium">
        <ControlPanelLink path="/manage/orders/gift-certificates" storeHash={storeHash}>
          BigCommerce Gift Certificates View
        </ControlPanelLink>
      </Box>

      <GiftCertificateTable
        giftCertificates={decoratedItems}
        hasNextPage={hasNextPage}
        query={query}
        storeHash={storeHash}
      />
    </Panel>
  );
}
