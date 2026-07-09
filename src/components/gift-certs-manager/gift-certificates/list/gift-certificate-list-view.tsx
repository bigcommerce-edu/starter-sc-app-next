import { Panel } from "@/components/ui/big-design";
import { GiftCertificateTable } from "@/components/gift-certs-manager/gift-certificates/list/gift-certificate-table";
import { decorateGiftCertificatesWithRecipientAccounts } from "@/lib/gift-certs-manager/gift-certificates/decorate-with-accounts";
import { fetchGiftCertificates } from "@/lib/gift-certs-manager/gift-certificates/gift-certificates-api";
import { parseGiftCertificatesQuery } from "@/lib/gift-certs-manager/gift-certificates/query";

export async function GiftCertificateListView({
  searchParams,
  storeHash,
}: {
  searchParams: Record<string, string | string[] | undefined>;
  storeHash: string | undefined;
}) {
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
