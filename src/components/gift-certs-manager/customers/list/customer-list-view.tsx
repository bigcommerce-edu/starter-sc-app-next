import { cacheLife, cacheTag } from "next/cache";
import { Box, Panel } from "@/components/ui/big-design";
import { ControlPanelLink } from "@/components/ui/control-panel-link";
import { CustomerTable } from "@/components/gift-certs-manager/customers/list/customer-table";
import { fetchChannels } from "@/lib/gift-certs-manager/channels/channels-api";
import { customerTag, CUSTOMERS_LIST_TAG } from "@/lib/gift-certs-manager/customers/cache-tags";
import { decorateCustomersWithChannels } from "@/lib/gift-certs-manager/customers/decorate-with-channels";
import { fetchCustomers } from "@/lib/gift-certs-manager/customers/customers-api";
import { parseCustomersQuery } from "@/lib/gift-certs-manager/customers/query";

// The "standard" cacheLife (see next.config.ts) is enough to keep this
// reasonably fresh on its own, but a mutation to a customer that's actually
// shown on this page (e.g. a store credit transfer, which shows up in this
// table's Store Credit column) should still update it immediately rather
// than wait out that lifetime — without invalidating every other cached
// listing page too. So beyond the shared list tag, this also tags the cache
// entry with every customer id actually present in the result set (added
// after the fetch resolves, since the ids aren't known before then — this is
// the documented "creating tags from external data" cacheTag pattern). Every
// mutating action already calls updateTag(customerTag(id)) for the customer
// it touched (see actions.ts's transferGiftCertificateBalanceToStoreCredit),
// so once tagged this way, only the listing pages that actually include that
// customer get invalidated by it. fetchChannels keeps its own nested `use
// cache` boundary with a longer lifetime (channels change far less often
// than customers), so it isn't governed by this component's own
// cacheLife/cacheTag. storeHash is the raw [storeHash] route param (or
// undefined on a root-level dev route) — a plain, serializable string, so
// it's safe to cross this cache boundary. It's used both for data-access
// calls (getRestApiClient resolves which store to actually target
// internally) and for building URLs further down.
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
