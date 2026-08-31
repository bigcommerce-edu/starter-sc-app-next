"use server";

import { ActionResult } from "@/lib/actions/action-result";
import {
  fetchGiftCertificate,
  refillGiftCertificateBalance as refillGiftCertificateBalanceRequest,
  updateGiftCertificateStatus as updateGiftCertificateStatusRequest,
} from "@/lib/gift-certs-manager/gift-certificates/gift-certificates-api";
import { GiftCertificateStatus } from "@/lib/gift-certs-manager/gift-certificates/types";
import { isNotFoundError, toSafeMessage } from "@/lib/errors/app-error";
import { logError } from "@/lib/errors/logger";
import { revalidatePath } from "next/cache";

// The gift certificate id is the only value these actions trust from the
// client, and every one of them re-fetches the certificate before mutating
// it — so a missing record here almost always means it was deleted (in the
// control panel, or by another admin) after the page was rendered. Calling
// that out specifically, rather than reporting a generic failure, tells the
// user their view is stale and a reload is what's needed. See
// isNotFoundError for how the two API versions signal a missing record
// differently.
const GIFT_CERTIFICATE_NOT_FOUND_MESSAGE =
  "That gift certificate no longer exists. It may have been deleted — reload the page to see the current list.";

// No isAuthorizedForStore check yet - that lands once session/auth exists.
// No cache tag revalidation yet either - that's the caching enhancement.
export async function updateGiftCertificateStatus(
  id: number | string,
  status: GiftCertificateStatus,
  storeHash: string | undefined,
): Promise<ActionResult> {
  try {
    // The caller only supplies id/status — every other field comes from this
    // fresh fetch, never from client-supplied data.
    const giftCertificate = await fetchGiftCertificate(id, storeHash);

    await updateGiftCertificateStatusRequest(giftCertificate, status, storeHash);
  } catch (error) {
    logError(`updateGiftCertificateStatus: certificate ${id}`, error);

    if (isNotFoundError(error)) {
      return { success: false, message: GIFT_CERTIFICATE_NOT_FOUND_MESSAGE };
    }

    return { success: false, message: toSafeMessage(error, "Failed to update the gift certificate status.") };
  }

  revalidatePath("/store/[storeHash]/gift-certs/[id]", "page");
  revalidatePath("/store/[storeHash]/gift-certs", "page");

  return { success: true, message: "Gift certificate status updated." };
}

// Refilling only makes sense for a certificate that's still usable (active
// or expired, not pending or disabled), and the new balance has to land
// between the current balance (exclusive) and the original value
// (inclusive) — a "refill" that lowers the balance is a debit, which this
// action deliberately won't do. Validated against a fresh fetch of the
// certificate (by id, the only value trusted from the client), not
// client-supplied status/amount.
export async function refillGiftCertificateBalance(
  id: number | string,
  newBalance: number,
  storeHash: string | undefined,
): Promise<ActionResult> {
  try {
    const giftCertificate = await fetchGiftCertificate(id, storeHash);

    if (giftCertificate.status !== "active" && giftCertificate.status !== "expired") {
      return { success: false, message: "Only active or expired gift certificates can be refilled." };
    }

    if (!Number.isFinite(newBalance) || newBalance < 0) {
      return { success: false, message: "Refill balance must be a non-negative number." };
    }

    if (newBalance <= giftCertificate.balance) {
      return { success: false, message: "Refill balance must be greater than the current gift certificate balance." };
    }

    if (newBalance > giftCertificate.amount) {
      return { success: false, message: "Refill balance cannot exceed the original gift certificate amount." };
    }

    await refillGiftCertificateBalanceRequest(giftCertificate, newBalance, storeHash);
  } catch (error) {
    logError(`refillGiftCertificateBalance: certificate ${id}`, error);

    if (isNotFoundError(error)) {
      return { success: false, message: GIFT_CERTIFICATE_NOT_FOUND_MESSAGE };
    }

    return { success: false, message: toSafeMessage(error, "Failed to refill the gift certificate balance.") };
  }
  
  revalidatePath("/store/[storeHash]/gift-certs/[id]", "page");
  revalidatePath("/store/[storeHash]/gift-certs", "page");

  return { success: true, message: "Gift certificate balance refilled." };
}
