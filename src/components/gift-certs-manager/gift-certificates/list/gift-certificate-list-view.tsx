import { Panel } from "@bigcommerce/big-design";
import { GiftCertificateTable } from "@/components/gift-certs-manager/gift-certificates/list/gift-certificate-table";
import { fetchGiftCertificates } from "@/lib/gift-certs-manager/gift-certificates/gift-certificates-api";
import { parseGiftCertificatesQuery } from "@/lib/gift-certs-manager/gift-certificates/query";

export async function GiftCertificateListView({
  searchParams,
  storeHash,
}: {
  searchParams: Record<string, string | string[] | undefined>;
  storeHash: string | undefined;
}) {
  // TODO: cache this render boundary with Cache Components
  //  - "use cache: remote" directive
  //  - cacheLife() with a lifetime profile with cacheProfile()
  //  - Use CACHE_PROFILE_STANDARD
  //  - cacheTag(GIFT_CERTIFICATES_LIST_TAG) up front

  const query = parseGiftCertificatesQuery(searchParams);
  const { items, hasNextPage } = await fetchGiftCertificates(query, storeHash);

  // TODO: add cache tags for each item
  //    cacheTag(giftCertificateTag(item.id)) for every item once the fetch
  //    resolves — see gift-certificates-api.ts's fetchGiftCertificatesPage
  //    for the same pattern

  return (
    <Panel header="Gift Certificates">
      <GiftCertificateTable
        giftCertificates={items}
        hasNextPage={hasNextPage}
        query={query}
        storeHash={storeHash}
      />
    </Panel>
  );
}
