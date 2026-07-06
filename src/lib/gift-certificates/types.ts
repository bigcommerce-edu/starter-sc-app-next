import { TableSortDirection } from "@/components/ui/big-design";

export const GIFT_CERTIFICATES_PATH = "/v2/gift_certificates";

export type GiftCertificateStatus = "active" | "redeemed" | "expired" | "disabled" | "pending";

export interface GiftCertificate {
  id: number;
  certificateNumber: string;
  status: GiftCertificateStatus;
  originalValue: number;
  currentBalance: number;
  recipientName: string;
  recipientEmail: string;
  purchaseDate: string;
}

export interface GiftCertificatesQuery {
  searchTerm: string;
  sortColumnHash: string;
  sortDirection: TableSortDirection;
  currentPage: number;
  itemsPerPage: number;
}

export interface GiftCertificatesResult {
  items: GiftCertificate[];
  totalItems: number;
}
