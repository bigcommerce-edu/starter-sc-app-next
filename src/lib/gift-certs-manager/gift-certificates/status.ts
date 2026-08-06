import { GiftCertificate, GiftCertificateStatus } from "@/lib/gift-certs-manager/gift-certificates/types";

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

// "Usable" means the certificate can still have balance put back on it:
// active, or expired (refilling/adding re-activates an expired one — see
// gift-certificates-api.ts). Pending and disabled certificates can't.
function isUsableStatus(status: GiftCertificateStatus): boolean {
  return status === "active" || status === "expired";
}

// Shared gating predicates for the balance actions, so the quick actions
// menu on the list page and the Balance tab on the detail page can't drift
// apart on when an action is offered — they previously disagreed about
// Refill (the menu also required room left to refill, the tab didn't).
// These mirror the validation the Server Actions re-run against a fresh
// fetch (see gift-certs/[id]/actions.ts); the client-side checks only
// decide what to *offer*, never what's allowed.
//
// Refilling raises the balance back up to at most the original amount, so
// it needs a certificate that's still usable (active or expired — refilling
// re-activates an expired one) and some room left below that amount.
export function canRefill(giftCertificate: Pick<GiftCertificate, "status" | "amount" | "balance">): boolean {
  return isUsableStatus(giftCertificate.status) && giftCertificate.balance < giftCertificate.amount;
}

// Same usability rule as refilling, but with no ceiling on the resulting
// balance — so unlike canRefill there's no room-remaining condition.
export function canAddToBalance(giftCertificate: Pick<GiftCertificate, "status">): boolean {
  return isUsableStatus(giftCertificate.status);
}

// TODO: Widen canTransferToStoreCredit to also require a registered
// customer account, once the certificate type carries one - the recipient
// needs somewhere for the credit to land.
//
// Transferring moves existing balance out to store credit, so it needs a
// strictly active certificate (not expired) and a balance to move.
export function canTransferToStoreCredit(
  giftCertificate: Pick<GiftCertificate, "status" | "balance">,
): boolean {
  return giftCertificate.balance > 0 && giftCertificate.status === "active";
}
