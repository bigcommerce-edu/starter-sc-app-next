import { GiftCertificateStatus } from "@/lib/gift-certificates/types";

export const GIFT_CERTIFICATE_STATUSES: GiftCertificateStatus[] = [
  "active",
  "pending",
  "redeemed",
  "disabled",
  "expired",
];

export const GIFT_CERTIFICATE_STATUS_LABEL: Record<GiftCertificateStatus, string> = {
  active: "Active",
  pending: "Pending",
  redeemed: "Redeemed",
  disabled: "Disabled",
  expired: "Expired",
};

export const GIFT_CERTIFICATE_STATUS_BADGE_VARIANT: Record<
  GiftCertificateStatus,
  "success" | "secondary" | "warning" | "danger"
> = {
  active: "success",
  pending: "warning",
  redeemed: "secondary",
  disabled: "danger",
  expired: "danger",
};
