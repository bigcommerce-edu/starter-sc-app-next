import { Customer, SortDirection } from "@/lib/gift-certs-manager/customers/types";

export const GIFT_CERTIFICATES_PATH = "/v2/gift_certificates";

export function getGiftCertificatePath(id: number | string): string {
  return `${GIFT_CERTIFICATES_PATH}/${id}`;
}

// Matches BigCommerce's real v2 status enum — see status.ts for why there's
// no "redeemed" value.
export type GiftCertificateStatus = "active" | "expired" | "disabled" | "pending";

// Matches the BigCommerce v2 gift certificate resource's field names
// directly. amount/balance are parsed to numbers once at fetch time (see
// gift-certificates-api.ts); purchase_date stays a raw Unix-timestamp string,
// formatted for display at render time instead.
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
// matches its recipient email. "Has an account" is just recipientAccount
// being defined, rather than a separate boolean to keep in sync.
export interface GiftCertificateWithRecipientAccount extends GiftCertificate {
  recipientAccount: Customer | undefined;
}

// The detail page additionally renders sender account info, so it decorates
// both sides.
export interface GiftCertificateWithAccounts extends GiftCertificateWithRecipientAccount {
  senderAccount: Customer | undefined;
}

// This app only exposes code/to_name/to_email as filters, even though
// BigCommerce also supports from_name/from_email — sender info isn't shown
// as a grid column, so filtering on it would be confusing. Field names match
// the request params fetchGiftCertificates sends directly. direction is kept
// uppercase (matching BigDesign's TableSortDirection) and lowercased by
// fetchGiftCertificates for the actual request.
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
  // No total count is available (see resolveHasNextPage in
  // gift-certificates-api.ts), so pagination is stateless next/previous only.
  hasNextPage: boolean;
}
