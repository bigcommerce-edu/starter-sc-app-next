import { cacheLife, cacheTag } from "next/cache";
import { Box, Panel } from "@/components/ui/big-design";
import { ControlPanelLink } from "@/components/ui/control-panel-link";
import { CustomerTable } from "@/components/gift-certs-manager/customers/list/customer-table";
import { fetchChannels } from "@/lib/gift-certs-manager/channels/channels-api";
import { customerTag, CUSTOMERS_LIST_TAG } from "@/lib/gift-certs-manager/customers/cache-tags";
import { decorateCustomersWithChannels } from "@/lib/gift-certs-manager/customers/decorate-with-channels";
import { fetchCustomers } from "@/lib/gift-certs-manager/customers/customers-api";
import { parseCustomersQuery } from "@/lib/gift-certs-manager/customers/query";

// Beyond the shared list tag, this also tags the cache entry with every
// customer id in the result set (added after the fetch resolves, once ids
// are known) so a mutation like a store credit transfer updates this page
// immediately without invalidating every other cached listing. fetchChannels
// keeps its own nested `use cache` boundary with a longer lifetime, so it
// isn't governed by this component's own cacheLife/cacheTag.
export async function CustomerListView({
  searchParams,
  storeHash,
}: {
  searchParams: Record<string, string | string[] | undefined>;
  storeHash: string | undefined;
}) {
  "use cache: remote";
  cacheLife("standard");
  cacheTag(CUSTOMERS_LIST_TAG);

  const query = parseCustomersQuery(searchParams);
  const [{ items, totalItems }, { items: channels }] = await Promise.all([
    fetchCustomers(query, storeHash),
    fetchChannels(storeHash),
  ]);

  for (const item of items) {
    cacheTag(customerTag(item.id));
  }

  const decoratedItems = await decorateCustomersWithChannels(items, storeHash, channels);

  return (
    <Panel header="Customers">
      <Box marginBottom="medium">
        <ControlPanelLink path="/manage/customers" storeHash={storeHash}>
          BigCommerce Customers View
        </ControlPanelLink>
      </Box>

      <CustomerTable customers={decoratedItems} totalItems={totalItems} query={query} storeHash={storeHash} />
    </Panel>
  );
}
