import { GiftCertificateStatus } from "@/lib/gift-certificates/types";

// Matches BigCommerce's real v2 gift certificate status enum exactly —
// there is no "redeemed" value on the wire. A fully-used certificate stays
// "active" with balance 0; components that want to call that out visually
// check balance === 0 directly rather than a dedicated status.
export const GIFT_CERTIFICATE_STATUSES: GiftCertificateStatus[] = ["active", "pending", "disabled", "expired"];

export const GIFT_CERTIFICATE_STATUS_LABEL: Record<GiftCertificateStatus, string> = {
  active: "Active",
  pending: "Pending",
  disabled: "Disabled",
  expired: "Expired",
};

export const GIFT_CERTIFICATE_STATUS_BADGE_VARIANT: Record<
  GiftCertificateStatus,
  "success" | "secondary" | "warning" | "danger"
> = {
  active: "success",
  pending: "warning",
  disabled: "danger",
  expired: "danger",
};
