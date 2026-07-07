import { Panel } from "@/components/ui/big-design";
import { GiftCertificateTable } from "@/components/gift-certificates/list/gift-certificate-table";
import { getDataMode } from "@/lib/api-client/get-api-client";
import { decorateGiftCertificatesWithRecipientAccounts } from "@/lib/gift-certificates/decorate-with-accounts";
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
  const decoratedItems = await decorateGiftCertificatesWithRecipientAccounts(items);

  return (
    <Panel header="Gift Certificates">
      <GiftCertificateTable
        giftCertificates={decoratedItems}
        totalItems={totalItems}
        query={query}
        storeHash={storeHash}
      />
    </Panel>
  );
}
