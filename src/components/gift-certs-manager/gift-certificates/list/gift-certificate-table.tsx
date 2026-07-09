"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Badge, Box, Link, Table, TableColumn } from "@/components/ui/big-design";
import { GiftCertificateActionsMenu } from "@/components/gift-certs-manager/gift-certificates/list/gift-certificate-actions-menu";
import { GiftCertificateFilters } from "@/components/gift-certs-manager/gift-certificates/list/gift-certificate-filters";
import { PendingOverlay } from "@/components/ui/pending-overlay";
import { buildGiftCertificatesSearchParams } from "@/lib/gift-certs-manager/gift-certificates/query";
import { GIFT_CERTIFICATE_STATUS_BADGE_VARIANT, GIFT_CERTIFICATE_STATUS_LABEL } from "@/lib/gift-certs-manager/gift-certificates/status";
import { GiftCertificatesQuery, GiftCertificateWithRecipientAccount } from "@/lib/gift-certs-manager/gift-certificates/types";
import { getAppUrl } from "@/lib/routing/app-url";

const ITEMS_PER_PAGE_OPTIONS = [10, 20, 50];

const currencyFormatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const dateFormatter = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });

function getColumns(
  urlStoreHash: string | undefined,
  showRecipientColumns: boolean,
): Array<TableColumn<GiftCertificateWithRecipientAccount>> {
  return [
    {
      header: "Certificate #",
      hash: "id",
      render: ({ id, code }: GiftCertificateWithRecipientAccount) => (
        <Link href={getAppUrl(urlStoreHash, `/gift-certs/${id}`)}>{code}</Link>
      ),
      // BigCommerce's v2 gift certificates endpoint only supports sort=id,
      // so this is the only sortable column — id isn't otherwise displayed,
      // but certificate numbers are assigned in id order, so sorting here
      // reads naturally as sorting by certificate number.
      isSortable: true,
    },
    {
      header: "Status",
      hash: "status",
      render: ({ status }: GiftCertificateWithRecipientAccount) => (
        <Badge label={GIFT_CERTIFICATE_STATUS_LABEL[status]} variant={GIFT_CERTIFICATE_STATUS_BADGE_VARIANT[status]} />
      ),
    },
    {
      header: "Original Value",
      hash: "amount",
      render: ({ amount }: GiftCertificateWithRecipientAccount) => currencyFormatter.format(amount),
      align: "right",
    },
    {
      header: "Current Balance",
      hash: "balance",
      render: ({ balance }: GiftCertificateWithRecipientAccount) => currencyFormatter.format(balance),
      align: "right",
    },
    ...(showRecipientColumns
      ? [
          {
            header: "Recipient",
            hash: "to_name",
            render: ({ recipientAccount, to_name }: GiftCertificateWithRecipientAccount) =>
              recipientAccount ? (
                <Link href={getAppUrl(urlStoreHash, `/customers/${recipientAccount.id}`)}>{to_name}</Link>
              ) : (
                to_name
              ),
          },
          {
            header: "Recipient Email",
            hash: "to_email",
            render: ({ to_email, recipientAccount }: GiftCertificateWithRecipientAccount) =>
              recipientAccount ? (
                <Link href={getAppUrl(urlStoreHash, `/customers/${recipientAccount.id}`)}>{to_email}</Link>
              ) : (
                to_email
              ),
          },
        ]
      : []),
    {
      header: "Purchase Date",
      hash: "purchase_date",
      render: ({ purchase_date }: GiftCertificateWithRecipientAccount) =>
        dateFormatter.format(new Date(Number(purchase_date) * 1000)),
    },
    {
      header: "Actions",
      hash: "actions",
      hideHeader: true,
      align: "right",
      render: (certificate: GiftCertificateWithRecipientAccount) => (
        <GiftCertificateActionsMenu
          certificate={certificate}
          detailUrl={getAppUrl(urlStoreHash, `/gift-certs/${certificate.id}`)}
          urlStoreHash={urlStoreHash}
        />
      ),
      width: 64,
    },
  ];
}

interface GiftCertificateTableProps {
  giftCertificates: GiftCertificateWithRecipientAccount[];
  // BigCommerce's v2 gift certificates endpoint never reports a total count,
  // so pagination here is stateless (next/previous only, no page count) —
  // see resolveHasNextPage in gift-certificates-api.ts.
  hasNextPage: boolean;
  query: GiftCertificatesQuery;
  urlStoreHash: string | undefined;
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
  hasNextPage,
  query,
  urlStoreHash,
  showFilters = true,
  showRecipientColumns = true,
}: GiftCertificateTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const columns = useMemo(() => getColumns(urlStoreHash, showRecipientColumns), [urlStoreHash, showRecipientColumns]);
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
  // GiftCertificateActionsMenu) being torn down while React treats the
  // update as interruptible.
  const navigate = (nextQuery: GiftCertificatesQuery) => {
    const params = buildGiftCertificatesSearchParams(nextQuery);
    const queryString = params.toString();

    setIsPending(true);
    router.push(queryString ? `${pathname}?${queryString}` : pathname);
  };

  return (
    <Box>
      {showFilters && (
        <GiftCertificateFilters onChange={(filters) => navigate({ ...query, ...filters, page: 1 })} query={query} />
      )}

      <PendingOverlay isPending={isPending}>
        <Table
          columns={columns}
          items={giftCertificates}
          keyField="id"
          sortable={{
            columnHash: "id",
            direction: query.direction,
            onSort: (_columnHash, direction) => navigate({ ...query, direction }),
          }}
          pagination={{
            itemsPerPage: query.limit,
            itemsPerPageOptions: ITEMS_PER_PAGE_OPTIONS,
            onPrevious: query.page > 1 ? () => navigate({ ...query, page: query.page - 1 }) : undefined,
            onNext: hasNextPage ? () => navigate({ ...query, page: query.page + 1 }) : undefined,
            onItemsPerPageChange: (limit) => navigate({ ...query, limit, page: 1 }),
          }}
        />
      </PendingOverlay>
    </Box>
  );
}
