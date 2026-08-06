"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Badge, Table, TableColumn } from "@bigcommerce/big-design";
import { AppLink } from "@/components/ui/app-link";
import { PendingOverlay } from "@/components/ui/pending-overlay";
import { buildGiftCertificatesSearchParams } from "@/lib/gift-certs-manager/gift-certificates/query";
import { GIFT_CERTIFICATE_STATUS_BADGE_VARIANT, GIFT_CERTIFICATE_STATUS_LABEL } from "@/lib/gift-certs-manager/gift-certificates/status";
import { GiftCertificate, GiftCertificatesQuery } from "@/lib/gift-certs-manager/gift-certificates/types";
import { getAppUrl } from "@/lib/routing/app-url";

const ITEMS_PER_PAGE_OPTIONS = [10, 20, 50];

const currencyFormatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const dateFormatter = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });

// TODO: add Recipient and Recipient Email columns
//  - takes GiftCertificateWithRecipientAccount instead of GiftCertificate,
//    and a showRecipientColumns flag so the customer detail page's reused
//    table (every row already sharing the same, known recipient) can hide
//    them
//  - Recipient: to_name as plain text, not a link - it's the name typed on
//    the certificate, which may not match the registered account's actual
//    name; only the email column (unambiguously the account's identifier)
//    links to the customer
//  - Recipient Email: links to /customers/{recipientAccount.id} when a
//    registered account was found, plain text otherwise
function getColumns(storeHash: string | undefined): Array<TableColumn<GiftCertificate>> {
  return [
    {
      header: "Certificate #",
      hash: "id",
      render: ({ id, code }: GiftCertificate) => (
        <AppLink href={getAppUrl(storeHash, `/gift-certs/${id}`)}>{code}</AppLink>
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
      render: ({ status }: GiftCertificate) => (
        <Badge label={GIFT_CERTIFICATE_STATUS_LABEL[status]} variant={GIFT_CERTIFICATE_STATUS_BADGE_VARIANT[status]} />
      ),
    },
    {
      header: "Original Value",
      hash: "amount",
      render: ({ amount }: GiftCertificate) => currencyFormatter.format(amount),
      align: "right",
    },
    {
      header: "Current Balance",
      hash: "balance",
      render: ({ balance }: GiftCertificate) => currencyFormatter.format(balance),
      align: "right",
    },
    {
      header: "Recipient",
      hash: "to_name",
      // Not a link: this is the name typed on the certificate, which
      // may not match the registered account's actual name — only
      // the email column (unambiguously the account's identifier)
      // links to the customer.
      render: ({ to_name }: GiftCertificate) => to_name,
    },
    {
      header: "Recipient Email",
      hash: "to_email",
      render: ({ to_email }: GiftCertificate) => to_email,
    },
    {
      header: "Purchase Date",
      hash: "purchase_date",
      render: ({ purchase_date }: GiftCertificate) =>
        dateFormatter.format(new Date(Number(purchase_date) * 1000)),
    },
    // TODO: add an Actions column rendering GiftCertificateActionsMenu,
    // hideHeader, align "right", width 64
  ];
}

// TODO: add showFilters/showRecipientColumns?: boolean (both default true)
// so the customer detail page can reuse this table pre-scoped to one
// customer's certificates, without the general-purpose filter UI or the
// (redundant, every row shares the same recipient) recipient columns
interface GiftCertificateTableProps {
  giftCertificates: GiftCertificate[];
  // BigCommerce's v2 gift certificates endpoint never reports a total count,
  // so pagination here is stateless (next/previous only, no page count) —
  // see resolveHasNextPage in gift-certificates-api.ts.
  hasNextPage: boolean;
  query: GiftCertificatesQuery;
  storeHash: string | undefined;
}

// Purely presentational: renders the page of items the server already
// fetched. Search/sort/pagination interactions navigate to a new URL (via
// router.push) rather than holding state or fetching data themselves —
// GiftCertificateListView reads the resulting searchParams and re-fetches server-side.
export function GiftCertificateTable({ giftCertificates, hasNextPage, query, storeHash }: GiftCertificateTableProps) {
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

  const navigate = (nextQuery: GiftCertificatesQuery) => {
    const params = buildGiftCertificatesSearchParams(nextQuery);
    const queryString = params.toString();

    setIsPending(true);
    router.push(queryString ? `${pathname}?${queryString}` : pathname);
  };

  return (
    <PendingOverlay isPending={isPending}>
      {/* TODO: Add GiftCertificateFilters */}

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
  );
}
