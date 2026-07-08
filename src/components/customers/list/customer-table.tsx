"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Box, Link, Table, TableColumn } from "@/components/ui/big-design";
import { CustomerActionsMenu } from "@/components/customers/list/customer-actions-menu";
import { CustomerFilters } from "@/components/customers/list/customer-filters";
import { PendingOverlay } from "@/components/ui/pending-overlay";
import { Channel } from "@/lib/channels/types";
import { buildCustomersSearchParams } from "@/lib/customers/query";
import { CustomersQuery, CustomerWithChannels } from "@/lib/customers/types";
import { getAppUrl } from "@/lib/routing/app-url";

const ITEMS_PER_PAGE_OPTIONS = [10, 20, 50];

const currencyFormatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function getColumns(storeHash: string | undefined): Array<TableColumn<CustomerWithChannels>> {
  return [
    {
      header: "Name",
      hash: "name",
      render: ({ id, firstName, lastName }: CustomerWithChannels) => (
        <Link href={getAppUrl(storeHash, `/customers/${id}`)}>{`${firstName} ${lastName}`}</Link>
      ),
      isSortable: true,
    },
    {
      header: "Email",
      hash: "email",
      render: ({ id, email }: CustomerWithChannels) => (
        <Link href={getAppUrl(storeHash, `/customers/${id}`)}>{email}</Link>
      ),
      isSortable: true,
    },
    {
      header: "Origin Channel",
      hash: "originChannelId",
      render: ({ originChannel, originChannelId }: CustomerWithChannels) => originChannel?.name ?? originChannelId,
    },
    {
      header: "Store Credit",
      hash: "storeCreditBalance",
      render: ({ storeCreditBalance }: CustomerWithChannels) => currencyFormatter.format(storeCreditBalance),
      isSortable: true,
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
        onChange={(filters) => navigate({ ...query, ...filters, currentPage: 1 })}
        query={query}
      />

      <PendingOverlay isPending={isPending}>
        <Table
          columns={columns}
          items={customers}
          keyField="id"
          itemName="customers"
          sortable={{
            columnHash: query.sortColumnHash,
            direction: query.sortDirection,
            onSort: (columnHash, direction) => navigate({ ...query, sortColumnHash: columnHash, sortDirection: direction }),
          }}
          pagination={{
            currentPage: query.currentPage,
            totalItems,
            itemsPerPage: query.itemsPerPage,
            itemsPerPageOptions: ITEMS_PER_PAGE_OPTIONS,
            onPageChange: (currentPage) => navigate({ ...query, currentPage }),
            onItemsPerPageChange: (itemsPerPage) => navigate({ ...query, itemsPerPage, currentPage: 1 }),
          }}
        />
      </PendingOverlay>
    </Box>
  );
}
