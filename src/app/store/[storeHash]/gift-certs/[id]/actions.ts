"use server";

import { updateTag } from "next/cache";
import { ActionResult } from "@/lib/actions/action-result";
import { giftCertificateTag } from "@/lib/gift-certs-manager/gift-certificates/cache-tags";
import {
  fetchGiftCertificate,
  refillGiftCertificateBalance as refillGiftCertificateBalanceRequest,
  updateGiftCertificateStatus as updateGiftCertificateStatusRequest,
} from "@/lib/gift-certs-manager/gift-certificates/gift-certificates-api";
import { GiftCertificateStatus } from "@/lib/gift-certs-manager/gift-certificates/types";
import { isAuthorizedForStore, NOT_AUTHORIZED_FOR_STORE_MESSAGE } from "@/lib/session/is-authorized-for-store";
import { isNotFoundError, toSafeMessage } from "@/lib/errors/app-error";
import { logError } from "@/lib/errors/logger";

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

    if (isNotFoundError(error)) {
      return { success: false, message: GIFT_CERTIFICATE_NOT_FOUND_MESSAGE };
    }

    return { success: false, message: toSafeMessage(error, "Failed to update the gift certificate status.") };
  }

  updateTag(giftCertificateTag(id));

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

  updateTag(giftCertificateTag(id));

  return { success: true, message: "Gift certificate balance refilled." };
}

// TODO: Implement addToGiftCertificateBalance - add an arbitrary amount to a gift certificate balance
//  - Requires the certificate to be active or expired, and the amount to be a positive number
//  - Update the cache tag for the affected gift certificate
//  - Report a missing certificate distinctly from other failures, the same
//    way the existing actions above do

// TODO: Implement transferGiftCertificateBalanceToStoreCredit - transfer a gift certificate's balance to the recipient's customer
// store credit
//  - requires the certificate to be active, the amount to be no more than
//    the current balance, and a registered customer account found by
//    recipient email (fetchCustomersByEmail, never trusted from the client)
//  - two independent API calls with no shared transaction: debit the
//    certificate first (debitGiftCertificateForTransfer), then credit the
//    customer (addToCustomerStoreCredit) - a failure on the second call
//    leaves the certificate already debited with nothing credited yet,
//    worse for the customer, but it avoids ever creating store credit
//    unbacked by an actual debit, the more dangerous failure mode (see
//    docs/ARCHITECTURE.md)
//  - if the credit call fails, one compensating call
//    (restoreGiftCertificateBalance) attempts to restore the certificate's
//    prior balance/status; if that also fails, the error message says
//    exactly what state was left to reconcile by hand
//  - updateTag(giftCertificateTag(id)) on every exit path that mutated the
//    certificate; updateTag(customerTag(customer.id)) added only on the
//    full-success path, since that's the only path where the customer was
//    actually mutated too
//  - Report a missing certificate distinctly on both the lookup and the
//    debit, the same way the existing actions above do
//  - If the credit call fails because the customer account itself is gone,
//    say so in the message - but only alongside whether the compensating
//    restore succeeded, since that's what actually matters to the user
