"use server";

import { ActionResult } from "@/lib/actions/action-result";
import {
  fetchGiftCertificate,
  refillGiftCertificateBalance as refillGiftCertificateBalanceRequest,
  updateGiftCertificateStatus as updateGiftCertificateStatusRequest,
} from "@/lib/gift-certs-manager/gift-certificates/gift-certificates-api";
import { GiftCertificateStatus } from "@/lib/gift-certs-manager/gift-certificates/types";
import { isAuthorizedForStore, NOT_AUTHORIZED_FOR_STORE_MESSAGE } from "@/lib/session/is-authorized-for-store";
import { toSafeMessage } from "@/lib/errors/app-error";
import { logError } from "@/lib/errors/logger";

export async function updateGiftCertificateStatus(
  id: number | string,
  status: GiftCertificateStatus,
  storeHash: string | undefined,
): Promise<ActionResult> {
  // A page/layout-level auth check does not extend to Server Actions, since
  // they're directly POST-able independent of any page render — see
  // isAuthorizedForStore.
  if (!(await isAuthorizedForStore(storeHash))) {
    return { success: false, message: NOT_AUTHORIZED_FOR_STORE_MESSAGE };
  }

  try {
    // The caller only supplies id/status — every other field comes from this
    // fresh fetch, never from client-supplied data.
    const giftCertificate = await fetchGiftCertificate(id, storeHash);

    await updateGiftCertificateStatusRequest(giftCertificate, status, storeHash);
  } catch (error) {
    logError(`updateGiftCertificateStatus: certificate ${id}`, error);

    return { success: false, message: toSafeMessage(error, "Failed to update the gift certificate status.") };
  }

  // TODO: revalidate this certificate's cache tag once the update succeeds
  //  - updateTag(giftCertificateTag(id)) right before returning success

  return { success: true, message: "Gift certificate status updated." };
}

// Refilling only makes sense for a certificate that's still usable (active
// or expired, not pending or disabled) and can't set a balance above the
// original value. Validated against a fresh fetch of the certificate (by
// id, the only value trusted from the client), not client-supplied
// status/amount.
export async function refillGiftCertificateBalance(
  id: number | string,
  newBalance: number,
  storeHash: string | undefined,
): Promise<ActionResult> {
  if (!(await isAuthorizedForStore(storeHash))) {
    return { success: false, message: NOT_AUTHORIZED_FOR_STORE_MESSAGE };
  }

  try {
    const giftCertificate = await fetchGiftCertificate(id, storeHash);

    if (giftCertificate.status !== "active" && giftCertificate.status !== "expired") {
      return { success: false, message: "Only active or expired gift certificates can be refilled." };
    }

    if (!Number.isFinite(newBalance) || newBalance < 0) {
      return { success: false, message: "Refill balance must be a non-negative number." };
    }

    if (newBalance > giftCertificate.amount) {
      return { success: false, message: "Refill balance cannot exceed the original gift certificate amount." };
    }

    await refillGiftCertificateBalanceRequest(giftCertificate, newBalance, storeHash);
  } catch (error) {
    logError(`refillGiftCertificateBalance: certificate ${id}`, error);

    return { success: false, message: toSafeMessage(error, "Failed to refill the gift certificate balance.") };
  }

  // TODO: revalidate this certificate's cache tag once the refill succeeds
  //  - updateTag(giftCertificateTag(id)) right before returning success

  return { success: true, message: "Gift certificate balance refilled." };
}
