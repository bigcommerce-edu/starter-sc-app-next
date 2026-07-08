import { Panel } from "@/components/ui/big-design";
import { CustomerTable } from "@/components/gift-certs-manager/customers/list/customer-table";
import { fetchChannels } from "@/lib/gift-certs-manager/channels/channels-api";
import { getDataMode } from "@/lib/api-client/get-api-client";
import { decorateCustomersWithChannels } from "@/lib/gift-certs-manager/customers/decorate-with-channels";
import { fetchCustomers } from "@/lib/gift-certs-manager/customers/customers-api";
import { parseCustomersQuery } from "@/lib/gift-certs-manager/customers/query";
import { assertStoreHashForDataMode } from "@/lib/routing/assert-store-hash";

export async function CustomerListView({
  searchParams,
  storeHash,
}: {
  searchParams: Record<string, string | string[] | undefined>;
  storeHash: string | undefined;
}) {
  assertStoreHashForDataMode(getDataMode(), storeHash);

  const query = parseCustomersQuery(searchParams);
  const [{ items, totalItems }, { items: channels }] = await Promise.all([fetchCustomers(query), fetchChannels()]);
  const decoratedItems = await decorateCustomersWithChannels(items, channels);

  return (
    <Panel header="Customers">
      <CustomerTable
        customers={decoratedItems}
        totalItems={totalItems}
        query={query}
        channels={channels}
        storeHash={storeHash}
      />
    </Panel>
  );
}
