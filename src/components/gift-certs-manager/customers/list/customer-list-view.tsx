// @cache-components-only:start
import { cacheLife, cacheTag } from "next/cache";
import { cacheProfile, CACHE_PROFILE_STANDARD } from "@/lib/cache/cache-profiles";
// @cache-components-only:end
import { Box, Panel } from "@bigcommerce/big-design";
import { ControlPanelLink } from "@/components/ui/control-panel-link";
import { CustomerTable } from "@/components/gift-certs-manager/customers/list/customer-table";
import { fetchChannels } from "@/lib/gift-certs-manager/channels/channels-api";
// @cache-components-only:start
import { customerTag, CUSTOMERS_LIST_TAG } from "@/lib/gift-certs-manager/customers/cache-tags";
// @cache-components-only:end
import { decorateCustomersWithChannels } from "@/lib/gift-certs-manager/customers/decorate-with-channels";
import { fetchCustomers } from "@/lib/gift-certs-manager/customers/customers-api";
import { parseCustomersQuery } from "@/lib/gift-certs-manager/customers/query";

export async function CustomerListView({
  searchParams,
  storeHash,
}: {
  searchParams: Record<string, string | string[] | undefined>;
  storeHash: string | undefined;
}) {
  // @cache-components-only:start
  "use cache: remote";
  cacheLife(cacheProfile(CACHE_PROFILE_STANDARD));
  cacheTag(CUSTOMERS_LIST_TAG);
  // @cache-components-only:end

  const query = parseCustomersQuery(searchParams);
  const [{ items, totalItems }, { items: channels }] = await Promise.all([
    fetchCustomers(query, storeHash),
    fetchChannels(storeHash),
  ]);

  // @cache-components-only:start
  for (const item of items) {
    cacheTag(customerTag(item.id));
  }
  // @cache-components-only:end

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
