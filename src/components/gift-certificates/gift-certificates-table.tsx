"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Badge, Box, Flex, Link, Search, Table, TableColumn } from "@/components/ui/big-design";
import { GiftCertificateActionsMenu } from "@/components/gift-certificates/gift-certificate-actions-menu";
import { buildGiftCertificatesSearchParams } from "@/lib/gift-certificates/query";
import { GiftCertificate, GiftCertificatesQuery, GiftCertificateStatus } from "@/lib/gift-certificates/types";
import { getAppUrl } from "@/lib/routing/app-url";

const STATUS_BADGE_VARIANT: Record<GiftCertificateStatus, "success" | "secondary" | "warning" | "danger"> = {
  active: "success",
  pending: "warning",
  redeemed: "secondary",
  disabled: "danger",
  expired: "danger",
};

const STATUS_LABEL: Record<GiftCertificateStatus, string> = {
  active: "Active",
  pending: "Pending",
  redeemed: "Redeemed",
  disabled: "Disabled",
  expired: "Expired",
};

const ITEMS_PER_PAGE_OPTIONS = [10, 20, 50];

const currencyFormatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const dateFormatter = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });

function getColumns(storeHash: string | undefined): Array<TableColumn<GiftCertificate>> {
  return [
    {
      header: "Certificate #",
      hash: "certificateNumber",
      render: ({ id, certificateNumber }: GiftCertificate) => (
        <Link href={getAppUrl(storeHash, `/gift-certs/${id}`)}>{certificateNumber}</Link>
      ),
      isSortable: true,
    },
    {
      header: "Status",
      hash: "status",
      render: ({ status }: GiftCertificate) => (
        <Badge label={STATUS_LABEL[status]} variant={STATUS_BADGE_VARIANT[status]} />
      ),
      isSortable: true,
    },
    {
      header: "Original Value",
      hash: "originalValue",
      render: ({ originalValue }: GiftCertificate) => currencyFormatter.format(originalValue),
      isSortable: true,
      align: "right",
    },
    {
      header: "Current Balance",
      hash: "currentBalance",
      render: ({ currentBalance }: GiftCertificate) => currencyFormatter.format(currentBalance),
      isSortable: true,
      align: "right",
    },
    {
      header: "Recipient",
      hash: "recipientName",
      render: ({ recipientName }: GiftCertificate) => recipientName,
      isSortable: true,
    },
    {
      header: "Recipient Email",
      hash: "recipientEmail",
      render: ({ recipientEmail }: GiftCertificate) => recipientEmail,
    },
    {
      header: "Purchase Date",
      hash: "purchaseDate",
      render: ({ purchaseDate }: GiftCertificate) => dateFormatter.format(new Date(purchaseDate)),
      isSortable: true,
    },
    {
      header: "Actions",
      hash: "actions",
      hideHeader: true,
      align: "right",
      render: (certificate: GiftCertificate) => (
        <GiftCertificateActionsMenu
          certificate={certificate}
          detailUrl={getAppUrl(storeHash, `/gift-certs/${certificate.id}`)}
        />
      ),
      width: 64,
    },
  ];
}

interface GiftCertificatesTableProps {
  giftCertificates: GiftCertificate[];
  totalItems: number;
  query: GiftCertificatesQuery;
  storeHash: string | undefined;
}

// Purely presentational: renders the page of items the server already fetched
// for the current query. Search/sort/pagination interactions navigate to a new
// URL (via router.push) rather than holding state or fetching data themselves —
// GiftCertificatesView reads the resulting searchParams and re-fetches server-side.
export function GiftCertificatesTable({ giftCertificates, totalItems, query, storeHash }: GiftCertificatesTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [searchTerm, setSearchTerm] = useState(query.searchTerm);
  const columns = useMemo(() => getColumns(storeHash), [storeHash]);

  const navigate = (nextQuery: GiftCertificatesQuery) => {
    const params = buildGiftCertificatesSearchParams(nextQuery);
    const queryString = params.toString();

    router.push(queryString ? `${pathname}?${queryString}` : pathname);
  };

  return (
    <Box>
      <Flex marginBottom="medium">
        <Search
          onChange={(event) => setSearchTerm(event.target.value)}
          onSubmit={() => navigate({ ...query, searchTerm, currentPage: 1 })}
          placeholder="Search by certificate #, recipient name, or email"
          value={searchTerm}
        />
      </Flex>

      <Table
        columns={columns}
        items={giftCertificates}
        keyField="id"
        itemName="gift certificates"
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
