import { Panel } from "@/components/ui/big-design";
import { GiftCertificateTable } from "@/components/gift-certs-manager/gift-certificates/list/gift-certificate-table";
import { StoreCredentials } from "@/lib/api-client/store-credentials";
import { decorateGiftCertificatesWithRecipientAccounts } from "@/lib/gift-certs-manager/gift-certificates/decorate-with-accounts";
import { fetchGiftCertificates } from "@/lib/gift-certs-manager/gift-certificates/gift-certificates-api";
import { parseGiftCertificatesQuery } from "@/lib/gift-certs-manager/gift-certificates/query";

export async function GiftCertificateListView({
  searchParams,
  urlStoreHash,
  apiCredentials,
}: {
  searchParams: Record<string, string | string[] | undefined>;
  urlStoreHash: string | undefined;
  apiCredentials: StoreCredentials;
}) {
  const query = parseGiftCertificatesQuery(searchParams);
  const { items, totalItems } = await fetchGiftCertificates(query, apiCredentials);
  const decoratedItems = await decorateGiftCertificatesWithRecipientAccounts(items, apiCredentials);

  return (
    <Panel header="Gift Certificates">
      <GiftCertificateTable
        giftCertificates={decoratedItems}
        totalItems={totalItems}
        query={query}
        urlStoreHash={urlStoreHash}
      />
    </Panel>
  );
}
