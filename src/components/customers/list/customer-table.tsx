"use client";

import { useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Box, Link, Table, TableColumn } from "@/components/ui/big-design";
import { CustomerActionsMenu } from "@/components/customers/list/customer-actions-menu";
import { CustomerFilters } from "@/components/customers/list/customer-filters";
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

  const navigate = (nextQuery: CustomersQuery) => {
    const params = buildCustomersSearchParams(nextQuery);
    const queryString = params.toString();

    router.push(queryString ? `${pathname}?${queryString}` : pathname);
  };

  return (
    <Box>
      <CustomerFilters
        channels={channels}
        onChange={(filters) => navigate({ ...query, ...filters, currentPage: 1 })}
        query={query}
      />

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
    </Box>
  );
}
