"use client";

import { useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Badge, Box, Link, Table, TableColumn } from "@/components/ui/big-design";
import { GiftCertificateActionsMenu } from "@/components/gift-certificates/list/gift-certificate-actions-menu";
import { GiftCertificateFilters } from "@/components/gift-certificates/list/gift-certificate-filters";
import { buildGiftCertificatesSearchParams } from "@/lib/gift-certificates/query";
import { GIFT_CERTIFICATE_STATUS_BADGE_VARIANT, GIFT_CERTIFICATE_STATUS_LABEL } from "@/lib/gift-certificates/status";
import { GiftCertificate, GiftCertificatesQuery } from "@/lib/gift-certificates/types";
import { getAppUrl } from "@/lib/routing/app-url";

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
        <Badge label={GIFT_CERTIFICATE_STATUS_LABEL[status]} variant={GIFT_CERTIFICATE_STATUS_BADGE_VARIANT[status]} />
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
      render: ({ recipientHasAccount, recipientName }: GiftCertificate) =>
        recipientHasAccount ? <Link href="#">{recipientName}</Link> : recipientName,
      isSortable: true,
    },
    {
      header: "Recipient Email",
      hash: "recipientEmail",
      render: ({ recipientEmail, recipientHasAccount }: GiftCertificate) =>
        recipientHasAccount ? <Link href="#">{recipientEmail}</Link> : recipientEmail,
    },
    {
      header: "Registered Account",
      hash: "recipientHasAccount",
      render: ({ recipientHasAccount }: GiftCertificate) => (recipientHasAccount ? "Yes" : "No"),
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

interface GiftCertificateTableProps {
  giftCertificates: GiftCertificate[];
  totalItems: number;
  query: GiftCertificatesQuery;
  storeHash: string | undefined;
}

// Purely presentational: renders the page of items the server already fetched
// for the current query. Search/sort/pagination interactions navigate to a new
// URL (via router.push) rather than holding state or fetching data themselves —
// GiftCertificateListView reads the resulting searchParams and re-fetches server-side.
export function GiftCertificateTable({ giftCertificates, totalItems, query, storeHash }: GiftCertificateTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const columns = useMemo(() => getColumns(storeHash), [storeHash]);

  const navigate = (nextQuery: GiftCertificatesQuery) => {
    const params = buildGiftCertificatesSearchParams(nextQuery);
    const queryString = params.toString();

    router.push(queryString ? `${pathname}?${queryString}` : pathname);
  };

  return (
    <Box>
      <GiftCertificateFilters onChange={(filters) => navigate({ ...query, ...filters, currentPage: 1 })} query={query} />

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
