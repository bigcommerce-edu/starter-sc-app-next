import { Panel } from "@/components/ui/big-design";
import { GiftCertificateTable } from "@/components/gift-certificates/list/gift-certificate-table";
import { getDataMode } from "@/lib/api-client/get-api-client";
import { fetchGiftCertificates } from "@/lib/gift-certificates/gift-certificates-api";
import { parseGiftCertificatesQuery } from "@/lib/gift-certificates/query";
import { assertStoreHashForDataMode } from "@/lib/routing/assert-store-hash";

export async function GiftCertificateListView({
  searchParams,
  storeHash,
}: {
  searchParams: Record<string, string | string[] | undefined>;
  storeHash: string | undefined;
}) {
  assertStoreHashForDataMode(getDataMode(), storeHash);

  const query = parseGiftCertificatesQuery(searchParams);
  const { items, totalItems } = await fetchGiftCertificates(query);

  return (
    <Panel header="Gift Certificates">
      <GiftCertificateTable giftCertificates={items} totalItems={totalItems} query={query} storeHash={storeHash} />
    </Panel>
  );
}
