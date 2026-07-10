import { cacheLife, cacheTag } from "next/cache";
import { Panel } from "@/components/ui/big-design";
import { CustomerTable } from "@/components/gift-certs-manager/customers/list/customer-table";
import { StoreCredentials } from "@/lib/api-client/store-credentials";
import { fetchChannels } from "@/lib/gift-certs-manager/channels/channels-api";
import { CUSTOMERS_LIST_TAG } from "@/lib/gift-certs-manager/customers/cache-tags";
import { decorateCustomersWithChannels } from "@/lib/gift-certs-manager/customers/decorate-with-channels";
import { fetchCustomers } from "@/lib/gift-certs-manager/customers/customers-api";
import { parseCustomersQuery } from "@/lib/gift-certs-manager/customers/query";

// Listing pages don't need per-record invalidation — the "standard" cacheLife
// (see next.config.ts) is enough to keep them reasonably fresh — so this
// only carries the shared list tag, which nothing currently invalidates.
// fetchChannels keeps its own nested `use cache` boundary with a longer
// lifetime (channels change far less often than customers), so it isn't
// governed by this component's own cacheLife/cacheTag.
export async function CustomerListView({
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
  cacheTag(CUSTOMERS_LIST_TAG);

  const query = parseCustomersQuery(searchParams);
  const [{ items, totalItems }, { items: channels }] = await Promise.all([
    fetchCustomers(query, apiCredentials),
    fetchChannels(apiCredentials),
  ]);
  const decoratedItems = await decorateCustomersWithChannels(items, apiCredentials, channels);

  return (
    <Panel header="Customers">
      <CustomerTable customers={decoratedItems} totalItems={totalItems} query={query} urlStoreHash={urlStoreHash} />
    </Panel>
  );
}
