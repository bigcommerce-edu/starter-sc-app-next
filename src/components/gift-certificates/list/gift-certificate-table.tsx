"use client";

import { useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Badge, Box, Link, Table, TableColumn } from "@/components/ui/big-design";
import { GiftCertificateActionsMenu } from "@/components/gift-certificates/list/gift-certificate-actions-menu";
import { GiftCertificateFilters } from "@/components/gift-certificates/list/gift-certificate-filters";
import { buildGiftCertificatesSearchParams } from "@/lib/gift-certificates/query";
import { GIFT_CERTIFICATE_STATUS_BADGE_VARIANT, GIFT_CERTIFICATE_STATUS_LABEL } from "@/lib/gift-certificates/status";
import { GiftCertificatesQuery, GiftCertificateWithRecipientAccount } from "@/lib/gift-certificates/types";
import { getAppUrl } from "@/lib/routing/app-url";

const ITEMS_PER_PAGE_OPTIONS = [10, 20, 50];

const currencyFormatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const dateFormatter = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });

function getColumns(
  storeHash: string | undefined,
  showRecipientColumns: boolean,
): Array<TableColumn<GiftCertificateWithRecipientAccount>> {
  return [
    {
      header: "Certificate #",
      hash: "certificateNumber",
      render: ({ id, certificateNumber }: GiftCertificateWithRecipientAccount) => (
        <Link href={getAppUrl(storeHash, `/gift-certs/${id}`)}>{certificateNumber}</Link>
      ),
      isSortable: true,
    },
    {
      header: "Status",
      hash: "status",
      render: ({ status }: GiftCertificateWithRecipientAccount) => (
        <Badge label={GIFT_CERTIFICATE_STATUS_LABEL[status]} variant={GIFT_CERTIFICATE_STATUS_BADGE_VARIANT[status]} />
      ),
      isSortable: true,
    },
    {
      header: "Original Value",
      hash: "originalValue",
      render: ({ originalValue }: GiftCertificateWithRecipientAccount) => currencyFormatter.format(originalValue),
      isSortable: true,
      align: "right",
    },
    {
      header: "Current Balance",
      hash: "currentBalance",
      render: ({ currentBalance }: GiftCertificateWithRecipientAccount) => currencyFormatter.format(currentBalance),
      isSortable: true,
      align: "right",
    },
    ...(showRecipientColumns
      ? [
          {
            header: "Recipient",
            hash: "recipientName",
            render: ({ recipientAccount, recipientName }: GiftCertificateWithRecipientAccount) =>
              recipientAccount ? (
                <Link href={getAppUrl(storeHash, `/customers/${recipientAccount.id}`)}>{recipientName}</Link>
              ) : (
                recipientName
              ),
            isSortable: true,
          },
          {
            header: "Recipient Email",
            hash: "recipientEmail",
            render: ({ recipientEmail, recipientAccount }: GiftCertificateWithRecipientAccount) =>
              recipientAccount ? (
                <Link href={getAppUrl(storeHash, `/customers/${recipientAccount.id}`)}>{recipientEmail}</Link>
              ) : (
                recipientEmail
              ),
          },
          {
            header: "Registered Account",
            hash: "recipientAccount",
            render: ({ recipientAccount }: GiftCertificateWithRecipientAccount) => (recipientAccount ? "Yes" : "No"),
          },
        ]
      : []),
    {
      header: "Purchase Date",
      hash: "purchaseDate",
      render: ({ purchaseDate }: GiftCertificateWithRecipientAccount) => dateFormatter.format(new Date(purchaseDate)),
      isSortable: true,
    },
    {
      header: "Actions",
      hash: "actions",
      hideHeader: true,
      align: "right",
      render: (certificate: GiftCertificateWithRecipientAccount) => (
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
  giftCertificates: GiftCertificateWithRecipientAccount[];
  totalItems: number;
  query: GiftCertificatesQuery;
  storeHash: string | undefined;
  // The customer detail page reuses this table, pre-scoped to one customer's
  // gift certificates, without exposing the general-purpose filter UI or the
  // recipient columns (every row already shares the same, known recipient).
  showFilters?: boolean;
  showRecipientColumns?: boolean;
}

// Purely presentational: renders the page of items the server already fetched
// for the current query. Search/sort/pagination interactions navigate to a new
// URL (via router.push) rather than holding state or fetching data themselves —
// GiftCertificateListView reads the resulting searchParams and re-fetches server-side.
export function GiftCertificateTable({
  giftCertificates,
  totalItems,
  query,
  storeHash,
  showFilters = true,
  showRecipientColumns = true,
}: GiftCertificateTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const columns = useMemo(() => getColumns(storeHash, showRecipientColumns), [storeHash, showRecipientColumns]);

  const navigate = (nextQuery: GiftCertificatesQuery) => {
    const params = buildGiftCertificatesSearchParams(nextQuery);
    const queryString = params.toString();

    router.push(queryString ? `${pathname}?${queryString}` : pathname);
  };

  return (
    <Box>
      {showFilters && (
        <GiftCertificateFilters onChange={(filters) => navigate({ ...query, ...filters, currentPage: 1 })} query={query} />
      )}

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
