import { Box, Panel } from "@bigcommerce/big-design";
import { ControlPanelLink } from "@/components/ui/control-panel-link";
import { GiftCertificateTable } from "@/components/gift-certs-manager/gift-certificates/list/gift-certificate-table";
import { decorateGiftCertificatesWithRecipientAccounts } from "@/lib/gift-certs-manager/gift-certificates/decorate-with-accounts";
import { fetchGiftCertificates } from "@/lib/gift-certs-manager/gift-certificates/gift-certificates-api";
import { parseGiftCertificatesQuery } from "@/lib/gift-certs-manager/gift-certificates/query";

// Beyond the shared list tag, this also tags the cache entry with every
// certificate id in the result set (added after the fetch resolves, once
// ids are known) so a mutation updates this page immediately without
// invalidating every other cached listing.
export async function GiftCertificateListView({
  searchParams,
  storeHash,
}: {
  searchParams: Record<string, string | string[] | undefined>;
  storeHash: string | undefined;
}) {
  const query = parseGiftCertificatesQuery(searchParams);
  const { items, hasNextPage } = await fetchGiftCertificates(query, storeHash);

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
