import { cacheLife, cacheTag } from "next/cache";
import { Panel } from "@/components/ui/big-design";
import { GiftCertificateTable } from "@/components/gift-certs-manager/gift-certificates/list/gift-certificate-table";
import { StoreCredentials } from "@/lib/api-client/store-credentials";
import { decorateGiftCertificatesWithRecipientAccounts } from "@/lib/gift-certs-manager/gift-certificates/decorate-with-accounts";
import { GIFT_CERTIFICATES_LIST_TAG } from "@/lib/gift-certs-manager/gift-certificates/cache-tags";
import { fetchGiftCertificates } from "@/lib/gift-certs-manager/gift-certificates/gift-certificates-api";
import { parseGiftCertificatesQuery } from "@/lib/gift-certs-manager/gift-certificates/query";

// Listing pages don't need per-record invalidation — the "standard" cacheLife
// (see next.config.ts) is enough to keep them reasonably fresh — so this
// only carries the shared list tag, which nothing currently invalidates.
// `use cache` wraps the whole rendered view (not just the underlying fetch),
// so a cache hit skips re-rendering GiftCertificateTable too.
export async function GiftCertificateListView({
  searchParams,
  urlStoreHash,
  apiCredentials,
}: {
  searchParams: Record<string, string | string[] | undefined>;
  urlStoreHash: string | undefined;
  apiCredentials: StoreCredentials;
}) {
  "use cache";
  cacheLife("standard");
  cacheTag(GIFT_CERTIFICATES_LIST_TAG);

  const query = parseGiftCertificatesQuery(searchParams);
  const { items, hasNextPage } = await fetchGiftCertificates(query, apiCredentials);
  const decoratedItems = await decorateGiftCertificatesWithRecipientAccounts(items, apiCredentials);

  return (
    <Panel header="Gift Certificates">
      <GiftCertificateTable
        giftCertificates={decoratedItems}
        hasNextPage={hasNextPage}
        query={query}
        urlStoreHash={urlStoreHash}
      />
    </Panel>
  );
}
