"use server";

import { updateTag } from "next/cache";
import { ActionResult } from "@/lib/actions/action-result";
import { customerTag } from "@/lib/gift-certs-manager/customers/cache-tags";
import { addToCustomerStoreCredit, fetchCustomersByEmail } from "@/lib/gift-certs-manager/customers/customers-api";
import { giftCertificateTag } from "@/lib/gift-certs-manager/gift-certificates/cache-tags";
import {
  addToGiftCertificateBalance as addToGiftCertificateBalanceRequest,
  debitGiftCertificateForTransfer,
  fetchGiftCertificate,
  refillGiftCertificateBalance as refillGiftCertificateBalanceRequest,
  restoreGiftCertificateBalance,
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

const CUSTOMER_NOT_FOUND_MESSAGE =
  "The recipient's customer account no longer exists. It may have been deleted — reload the page and try again.";

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

// Same usability restriction as refilling, but no ceiling on the resulting
// balance — adding can push it above the certificate's original amount.
export async function addToGiftCertificateBalance(
  id: number | string,
  amount: number,
  storeHash: string | undefined,
): Promise<ActionResult> {
  if (!(await isAuthorizedForStore(storeHash))) {
    return { success: false, message: NOT_AUTHORIZED_FOR_STORE_MESSAGE };
  }

  try {
    const giftCertificate = await fetchGiftCertificate(id, storeHash);

    if (giftCertificate.status !== "active" && giftCertificate.status !== "expired") {
      return { success: false, message: "Only active or expired gift certificates can have balance added." };
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return { success: false, message: "Amount must be a positive number." };
    }

    await addToGiftCertificateBalanceRequest(giftCertificate, amount, storeHash);
  } catch (error) {
    logError(`addToGiftCertificateBalance: certificate ${id}`, error);

    if (isNotFoundError(error)) {
      return { success: false, message: GIFT_CERTIFICATE_NOT_FOUND_MESSAGE };
    }

    return { success: false, message: toSafeMessage(error, "Failed to add to the gift certificate balance.") };
  }

  updateTag(giftCertificateTag(id));

  return { success: true, message: "Amount added to gift certificate balance." };
}

// Transferring requires the certificate to be active, the amount to be no
// more than the current balance, and a registered customer account to
// receive the credit (looked up by recipient email, never trusted from the
// client).
//
// This is two independent API calls with no shared transaction: the
// certificate is debited first, then the customer is credited. A failure on
// the second call leaves the certificate already debited with nothing
// credited yet — worse for the customer, but it avoids ever creating store
// credit unbacked by an actual debit, the more dangerous failure mode (see
// docs/ARCHITECTURE.md). If the second call fails, one compensating call
// attempts to restore the certificate's prior balance/status; if that also
// fails, the error message says exactly what state was left to reconcile by
// hand.
export async function transferGiftCertificateBalanceToStoreCredit(
  id: number | string,
  amount: number,
  storeHash: string | undefined,
): Promise<ActionResult> {
  if (!(await isAuthorizedForStore(storeHash))) {
    return { success: false, message: NOT_AUTHORIZED_FOR_STORE_MESSAGE };
  }

  let giftCertificate: Awaited<ReturnType<typeof fetchGiftCertificate>>;
  let customer: Awaited<ReturnType<typeof fetchCustomersByEmail>>["items"][number];

  try {
    giftCertificate = await fetchGiftCertificate(id, storeHash);

    if (giftCertificate.status !== "active") {
      return { success: false, message: "Only active gift certificates can be transferred to store credit." };
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return { success: false, message: "Transfer amount must be a positive number." };
    }

    if (amount > giftCertificate.balance) {
      return { success: false, message: "Transfer amount cannot exceed the current gift certificate balance." };
    }

    const { items: customers } = await fetchCustomersByEmail([giftCertificate.to_email], storeHash);
    const foundCustomer = customers.find((item) => item.email.toLowerCase() === giftCertificate.to_email.toLowerCase());

    if (!foundCustomer) {
      return { success: false, message: "The gift certificate recipient has no registered customer account." };
    }

    customer = foundCustomer;
  } catch (error) {
    logError(`transferGiftCertificateBalanceToStoreCredit: certificate ${id}`, error);

    // Only the certificate fetch can raise a not-found here — a recipient
    // with no account is a zero-row list, already handled by the
    // !foundCustomer check above rather than an error.
    if (isNotFoundError(error)) {
      return { success: false, message: GIFT_CERTIFICATE_NOT_FOUND_MESSAGE };
    }

    return { success: false, message: toSafeMessage(error, "Failed to look up the gift certificate or recipient.") };
  }

  const previousBalance = giftCertificate.balance;
  const previousStatus = giftCertificate.status;

  try {
    await debitGiftCertificateForTransfer(giftCertificate, amount, storeHash);
  } catch (error) {
    logError(`transferGiftCertificateBalanceToStoreCredit: debit for certificate ${id}`, error);

    // Deleted between the fetch above and this write. Nothing was mutated,
    // so there's no compensating call to make.
    if (isNotFoundError(error)) {
      return { success: false, message: GIFT_CERTIFICATE_NOT_FOUND_MESSAGE };
    }

    return { success: false, message: toSafeMessage(error, "Failed to debit the gift certificate.") };
  }

  try {
    await addToCustomerStoreCredit(customer, amount, storeHash);
  } catch (creditError) {
    // The certificate is already debited at this point, so a missing
    // customer can't just be reported on its own — what matters to the user
    // is whether the compensating restore below put the balance back.
    const isMissingCustomer = isNotFoundError(creditError);

    try {
      await restoreGiftCertificateBalance(giftCertificate, previousBalance, previousStatus, storeHash);
    } catch {
      // Only the certificate was mutated — the customer credit never
      // succeeded, so there's no customer tag to invalidate here.
      updateTag(giftCertificateTag(id));

      return {
        success: false,
        message: `Critical: gift certificate ${id} was debited ${amount} but the store credit grant to customer ${customer.id} failed${
          isMissingCustomer ? " because that customer account no longer exists" : ""
        }, and reverting the certificate also failed. Manual reconciliation is required.`,
      };
    }

    updateTag(giftCertificateTag(id));

    return {
      success: false,
      message: isMissingCustomer
        ? `${CUSTOMER_NOT_FOUND_MESSAGE} The gift certificate balance was restored, so no changes were made.`
        : "The store credit grant failed, but the gift certificate balance was restored. No changes were made.",
    };
  }

  // Both resources were mutated on the success path, so both tags need
  // invalidating: the certificate's own balance/status, and this customer's
  // store credit balance shown on their detail page.
  updateTag(giftCertificateTag(id));
  updateTag(customerTag(customer.id));

  return { success: true, message: "Gift certificate balance transferred to store credit." };
}
