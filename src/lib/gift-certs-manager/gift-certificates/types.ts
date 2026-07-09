import { Customer, SortDirection } from "@/lib/gift-certs-manager/customers/types";

export const GIFT_CERTIFICATES_PATH = "/v2/gift_certificates";

export function getGiftCertificatePath(id: number | string): string {
  return `${GIFT_CERTIFICATES_PATH}/${id}`;
}

// Matches BigCommerce's real v2 status enum — see status.ts for why there's
// no "redeemed" value.
export type GiftCertificateStatus = "active" | "expired" | "disabled" | "pending";

// Matches the BigCommerce v2 gift certificate resource exactly (see
// https://docs.bigcommerce.com/docs/rest-content/gift-certificates) — same
// field names as the wire response, so there's no separate "API" vs. "app"
// shape to keep in sync. amount/balance are parsed to numbers once at fetch
// time (see gift-certificates-api.ts); purchase_date is left as the raw
// Unix-timestamp string the API returns — components format it for display
// at render time (see e.g. gift-certificate-table.tsx) rather than it being
// pre-converted here.
export interface GiftCertificate {
  id: number;
  code: string;
  status: GiftCertificateStatus;
  amount: number;
  balance: number;
  purchase_date: string;
  template: string;
  from_name: string;
  from_email: string;
  to_name: string;
  to_email: string;
}

// A GiftCertificate decorated with whichever registered customer account
// matches its recipient email (see lib/customers). "Has an account" is just
// recipientAccount being defined — there's no separate boolean to keep in
// sync, and the account's own name is available directly instead of a
// denormalized recipientAccountName copy. The listing page only ever renders
// recipient account info, so it only ever needs to decorate this far.
export interface GiftCertificateWithRecipientAccount extends GiftCertificate {
  recipientAccount: Customer | undefined;
}

// The detail page additionally renders sender account info, so it decorates
// both sides.
export interface GiftCertificateWithAccounts extends GiftCertificateWithRecipientAccount {
  senderAccount: Customer | undefined;
}

// BigCommerce's v2 gift certificates endpoint also supports from_name/
// from_email filters, but this app only exposes code/to_name/to_email as
// filters — sender name/email aren't shown as grid columns, so filtering on
// them would be confusing. Field names match the request params
// fetchGiftCertificates sends directly (page/limit are the real query param
// names too), so there's no separate translation step between this and the
// wire request. direction is the one exception: it's kept uppercase (matching
// BigDesign's own TableSortDirection, which the UI layer's Table component
// sort control binds to directly) since fetchGiftCertificates lowercases it
// for the actual request — the same kind of value-format conversion as
// amount/balance.
export interface GiftCertificatesQuery {
  code: string;
  to_name: string;
  to_email: string;
  direction: SortDirection;
  page: number;
  limit: number;
}

export interface GiftCertificatesResult {
  items: GiftCertificate[];
  // BigCommerce's v2 gift certificates endpoint reports no total count
  // anywhere, so there's no accurate way to know how many pages exist —
  // only whether there's at least one more (see resolveHasNextPage in
  // gift-certificates-api.ts). The table's pagination is stateless (next/
  // previous only, no page count) to match what's actually knowable here.
  hasNextPage: boolean;
}
