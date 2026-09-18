import { Box, Panel } from "@bigcommerce/big-design";
import { ControlPanelLink } from "@/components/ui/control-panel-link";
import { CustomerTable } from "@/components/gift-certs-manager/customers/list/customer-table";
import { fetchChannels } from "@/lib/gift-certs-manager/channels/channels-api";
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
  const query = parseCustomersQuery(searchParams);
  const [{ items, totalItems }, { items: channels }] = await Promise.all([
    fetchCustomers(query, storeHash),
    fetchChannels(storeHash),
  ]);

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
