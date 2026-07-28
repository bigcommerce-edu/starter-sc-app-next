"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Box, Table, TableColumn } from "@/components/ui/big-design";
import { AppLink } from "@/components/ui/app-link";
import { CustomerActionsMenu } from "@/components/gift-certs-manager/customers/list/customer-actions-menu";
import { CustomerFilters } from "@/components/gift-certs-manager/customers/list/customer-filters";
import { PendingOverlay } from "@/components/ui/pending-overlay";
import { buildCustomersSearchParams } from "@/lib/gift-certs-manager/customers/query";
import {
  CustomersQuery,
  CustomersSortColumn,
  CustomerWithChannels,
  sumStoreCredit,
} from "@/lib/gift-certs-manager/customers/types";
import { getAppUrl } from "@/lib/routing/app-url";

const ITEMS_PER_PAGE_OPTIONS = [10, 20, 50];

const currencyFormatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const dateFormatter = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });

function getColumns(storeHash: string | undefined): Array<TableColumn<CustomerWithChannels>> {
  return [
    {
      header: "Name",
      hash: "name",
      render: ({ id, first_name, last_name }: CustomerWithChannels) => (
        <AppLink href={getAppUrl(storeHash, `/customers/${id}`)}>{`${first_name} ${last_name}`}</AppLink>
      ),
      isSortable: true,
    },
    {
      header: "Email",
      hash: "email",
      render: ({ id, email }: CustomerWithChannels) => (
        <AppLink href={getAppUrl(storeHash, `/customers/${id}`)}>{email}</AppLink>
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
      header: "Customer Since",
      hash: "date_created",
      render: ({ date_created }: CustomerWithChannels) => dateFormatter.format(new Date(date_created)),
      isSortable: true,
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
  storeHash: string | undefined;
}

// Purely presentational: renders the page of items the server already
// fetched. Search/sort/pagination interactions navigate to a new URL (via
// router.push) rather than holding state or fetching data themselves —
// CustomerListView reads the resulting searchParams and re-fetches server-side.
export function CustomerTable({ customers, totalItems, query, storeHash }: CustomerTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const columns = useMemo(() => getColumns(storeHash), [storeHash]);
  const [isPending, setIsPending] = useState(false);
  const [lastQuery, setLastQuery] = useState(query);

  // A change in query (vs. what we last rendered with) signals the pending
  // navigation finished. Adjusted directly during render (React's documented
  // pattern) rather than in an effect, to avoid an extra re-render.
  if (query !== lastQuery) {
    setLastQuery(query);
    setIsPending(false);
  }

  // router.push re-renders this route's Server Components in place, so the
  // page's <Suspense> fallback never fires again here — isPending gives us
  // our own lightweight "refreshing" state instead. Deliberately avoids
  // wrapping router.push in useTransition/startTransition: doing so causes a
  // "removeChild: not a child of this node" error, seemingly from the
  // per-row Dropdown/Modal portals in CustomerActionsMenu being torn down
  // while React treats the update as interruptible.
  const navigate = (nextQuery: CustomersQuery) => {
    const params = buildCustomersSearchParams(nextQuery);
    const queryString = params.toString();

    setIsPending(true);
    router.push(queryString ? `${pathname}?${queryString}` : pathname);
  };

  return (
    <Box>
      <PendingOverlay isPending={isPending}>
        <CustomerFilters onChange={(filters) => navigate({ ...query, ...filters, page: 1 })} query={query} />

        <Table
          columns={columns}
          items={customers}
          keyField="id"
          itemName="customers"
          sortable={{
            columnHash: query.sortColumn,
            direction: query.direction,
            onSort: (columnHash, direction) =>
              navigate({ ...query, sortColumn: columnHash as CustomersSortColumn, direction }),
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
