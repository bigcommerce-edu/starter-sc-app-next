"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Box, Link, Table, TableColumn } from "@/components/ui/big-design";
import { CustomerActionsMenu } from "@/components/customers/list/customer-actions-menu";
import { CustomerFilters } from "@/components/customers/list/customer-filters";
import { PendingOverlay } from "@/components/ui/pending-overlay";
import { Channel } from "@/lib/channels/types";
import { buildCustomersSearchParams } from "@/lib/customers/query";
import { CustomersQuery, CustomerWithChannels, sumStoreCredit } from "@/lib/customers/types";
import { getAppUrl } from "@/lib/routing/app-url";

const ITEMS_PER_PAGE_OPTIONS = [10, 20, 50];

const currencyFormatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function getColumns(storeHash: string | undefined): Array<TableColumn<CustomerWithChannels>> {
  return [
    {
      header: "Name",
      hash: "name",
      render: ({ id, first_name, last_name }: CustomerWithChannels) => (
        <Link href={getAppUrl(storeHash, `/customers/${id}`)}>{`${first_name} ${last_name}`}</Link>
      ),
      isSortable: true,
    },
    {
      header: "Email",
      hash: "email",
      render: ({ id, email }: CustomerWithChannels) => (
        <Link href={getAppUrl(storeHash, `/customers/${id}`)}>{email}</Link>
      ),
    },
    {
      header: "Origin Channel",
      hash: "origin_channel_id",
      render: ({ originChannel, origin_channel_id }: CustomerWithChannels) => originChannel?.name ?? origin_channel_id,
    },
    {
      header: "Store Credit",
      hash: "store_credit_amounts",
      render: ({ store_credit_amounts }: CustomerWithChannels) => currencyFormatter.format(sumStoreCredit(store_credit_amounts)),
      align: "right",
    },
    {
      header: "Actions",
      hash: "actions",
      hideHeader: true,
      align: "right",
      render: (customer: CustomerWithChannels) => (
        <CustomerActionsMenu customer={customer} detailUrl={getAppUrl(storeHash, `/customers/${customer.id}`)} />
      ),
      width: 64,
    },
  ];
}

interface CustomerTableProps {
  customers: CustomerWithChannels[];
  totalItems: number;
  query: CustomersQuery;
  channels: Channel[];
  storeHash: string | undefined;
}

// Purely presentational: renders the page of items the server already fetched
// for the current query. Search/sort/pagination interactions navigate to a new
// URL (via router.push) rather than holding state or fetching data themselves —
// CustomerListView reads the resulting searchParams and re-fetches server-side.
export function CustomerTable({ customers, totalItems, query, channels, storeHash }: CustomerTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const columns = useMemo(() => getColumns(storeHash), [storeHash]);
  const [isPending, setIsPending] = useState(false);
  const [lastQuery, setLastQuery] = useState(query);

  // query is derived server-side from the URL and passed back down once the
  // navigation below resolves, so a change here (vs. the query we were last
  // rendered with) is the signal that the pending request finished. Adjusted
  // directly during render (React's documented pattern for this) rather than
  // in an effect, since setting state from an effect here would cause an
  // extra, avoidable re-render.
  if (query !== lastQuery) {
    setLastQuery(query);
    setIsPending(false);
  }

  // router.push re-renders this route's Server Components in place rather
  // than remounting them, so the <Suspense> boundary around the page (which
  // only shows its fallback on first mount) never fires again here. isPending
  // gives us our own lightweight "refreshing" state instead, without losing
  // the table that's already on screen. This intentionally avoids wrapping
  // router.push in useTransition/startTransition: doing so here causes React
  // to throw a "removeChild: not a child of this node" error when the table
  // re-renders, seemingly due to the per-row Dropdown/Modal portals (in
  // CustomerActionsMenu) being torn down while React treats the update as
  // interruptible.
  const navigate = (nextQuery: CustomersQuery) => {
    const params = buildCustomersSearchParams(nextQuery);
    const queryString = params.toString();

    setIsPending(true);
    router.push(queryString ? `${pathname}?${queryString}` : pathname);
  };

  return (
    <Box>
      <CustomerFilters
        channels={channels}
        onChange={(filters) => navigate({ ...query, ...filters, page: 1 })}
        query={query}
      />

      <PendingOverlay isPending={isPending}>
        <Table
          columns={columns}
          items={customers}
          keyField="id"
          itemName="customers"
          sortable={{
            columnHash: "name",
            direction: query.direction,
            onSort: (_columnHash, direction) => navigate({ ...query, direction }),
          }}
          pagination={{
            currentPage: query.page,
            totalItems,
            itemsPerPage: query.limit,
            itemsPerPageOptions: ITEMS_PER_PAGE_OPTIONS,
            onPageChange: (page) => navigate({ ...query, page }),
            onItemsPerPageChange: (limit) => navigate({ ...query, limit, page: 1 }),
          }}
        />
      </PendingOverlay>
    </Box>
  );
}
