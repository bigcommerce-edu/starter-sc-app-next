import { TableSortDirection } from "@/components/ui/big-design";

export const GIFT_CERTIFICATES_PATH = "/v2/gift_certificates";

export function getGiftCertificatePath(id: number | string): string {
  return `${GIFT_CERTIFICATES_PATH}/${id}`;
}

export type GiftCertificateStatus = "active" | "redeemed" | "expired" | "disabled" | "pending";

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
  // Whether the sender/recipient has a registered customer account, and the
  // current name on that account if so. These can differ from senderName/
  // recipientName, which reflect what was entered at the time of purchase.
  senderHasAccount: boolean;
  senderAccountName?: string;
  recipientName: string;
  recipientEmail: string;
  recipientHasAccount: boolean;
  recipientAccountName?: string;
}

// "any" means the filter is not applied; "yes"/"no" narrow to a specific value.
export type TriStateFilter = "any" | "yes" | "no";

export interface GiftCertificatesQuery {
  certificateNumber: string;
  status: GiftCertificateStatus[];
  balanceMin: number | undefined;
  balanceMax: number | undefined;
  recipientName: string;
  recipientEmail: string;
  recipientHasAccount: TriStateFilter;
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
