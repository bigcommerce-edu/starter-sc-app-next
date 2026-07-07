import { TableSortDirection } from "@/components/ui/big-design";
import { Customer } from "@/lib/customers/types";

export const GIFT_CERTIFICATES_PATH = "/v2/gift_certificates";

export function getGiftCertificatePath(id: number | string): string {
  return `${GIFT_CERTIFICATES_PATH}/${id}`;
}

export type GiftCertificateStatus = "active" | "redeemed" | "expired" | "disabled" | "pending";

// Shape returned by the gift certificates endpoint itself. Notably, this
// endpoint has no notion of registered customer accounts — see
// GiftCertificateWithAccounts for the decorated shape pages actually render.
export interface GiftCertificate {
  id: number;
  certificateNumber: string;
  status: GiftCertificateStatus;
  originalValue: number;
  currentBalance: number;
  purchaseDate: string;
  emailTemplate: string;
  senderName: string;
  senderEmail: string;
  recipientName: string;
  recipientEmail: string;
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

export interface GiftCertificatesQuery {
  certificateNumber: string;
  status: GiftCertificateStatus[];
  balanceMin: number | undefined;
  balanceMax: number | undefined;
  recipientName: string;
  recipientEmail: string;
  purchasedAfter: string;
  purchasedBefore: string;
  sortColumnHash: string;
  sortDirection: TableSortDirection;
  currentPage: number;
  itemsPerPage: number;
}

export interface GiftCertificatesResult {
  items: GiftCertificate[];
  totalItems: number;
}
