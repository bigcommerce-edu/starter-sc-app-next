import { Panel } from "@/components/ui/big-design";
import { CustomerTable } from "@/components/gift-certs-manager/customers/list/customer-table";
import { StoreCredentials } from "@/lib/api-client/store-credentials";
import { fetchChannels } from "@/lib/gift-certs-manager/channels/channels-api";
import { decorateCustomersWithChannels } from "@/lib/gift-certs-manager/customers/decorate-with-channels";
import { fetchCustomers } from "@/lib/gift-certs-manager/customers/customers-api";
import { parseCustomersQuery } from "@/lib/gift-certs-manager/customers/query";

export async function CustomerListView({
  searchParams,
  urlStoreHash,
  apiCredentials,
}: {
  searchParams: Record<string, string | string[] | undefined>;
  urlStoreHash: string | undefined;
  apiCredentials: StoreCredentials;
}) {
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
