"use server";

import { updateTag } from "next/cache";
import { getDataMode } from "@/lib/api-client/get-api-client";
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

export async function updateGiftCertificateStatus(
  id: number | string,
  status: GiftCertificateStatus,
  storeHash: string | undefined,
): Promise<ActionResult> {
  // The caller only supplies id/status — every other field used to build the
  // update request (and any future validation against the certificate's real
  // state) comes from this fresh fetch, never from client-supplied data.
  const giftCertificate = await fetchGiftCertificate(id, storeHash);

  await updateGiftCertificateStatusRequest(giftCertificate, status, storeHash);

  updateTag(giftCertificateTag(id));

  return { success: true, message: "Gift certificate status updated." };
}

// Re-send is only meaningful in MULTITENANT mode (MOCK/STATIC have no real
// recipient to email), and MULTITENANT itself isn't implemented yet.
export async function resendGiftCertificateEmail(id: number | string): Promise<ActionResult> {
  void id;

  const dataMode = getDataMode();

  if (dataMode !== "MULTITENANT") {
    throw new Error(`Re-send is not available in ${dataMode} mode.`);
  }

  throw new Error("Re-send not yet implemented.");
}

// Refilling only makes sense for a certificate that's still usable (active
// or expired — not pending, which hasn't gone out yet, and not disabled,
// which was deliberately turned off) and can't set a balance above the
// certificate's original value. Both are validation failures rather than
// API errors, so they're returned as ActionResult failures instead of thrown.
// Critically, that validation runs against a fresh fetch of the certificate
// (by id — the only value trusted from the client), not the client-supplied
// status/amount a caller could otherwise forge to bypass both checks.
export async function refillGiftCertificateBalance(
  id: number | string,
  newBalance: number,
  storeHash: string | undefined,
): Promise<ActionResult> {
  const giftCertificate = await fetchGiftCertificate(id, storeHash);

  if (giftCertificate.status !== "active" && giftCertificate.status !== "expired") {
    return { success: false, message: "Only active or expired gift certificates can be refilled." };
  }

  if (newBalance > giftCertificate.amount) {
    return { success: false, message: "Refill balance cannot exceed the original gift certificate amount." };
  }

  await refillGiftCertificateBalanceRequest(giftCertificate, newBalance, storeHash);

  updateTag(giftCertificateTag(id));

  return { success: true, message: "Gift certificate balance refilled." };
}

// Same usability restriction as refilling (active/expired only), but unlike
// refilling there's no ceiling on the resulting balance — adding is allowed
// to push it above the certificate's original amount. Validated against a
// fresh fetch of the certificate for the same reason as refillGiftCertificateBalance:
// status is not something a caller should be able to forge to bypass this.
export async function addToGiftCertificateBalance(
  id: number | string,
  amount: number,
  storeHash: string | undefined,
): Promise<ActionResult> {
  const giftCertificate = await fetchGiftCertificate(id, storeHash);

  if (giftCertificate.status !== "active" && giftCertificate.status !== "expired") {
    return { success: false, message: "Only active or expired gift certificates can have balance added." };
  }

  await addToGiftCertificateBalanceRequest(giftCertificate, amount, storeHash);

  updateTag(giftCertificateTag(id));

  return { success: true, message: "Amount added to gift certificate balance." };
}

// Transferring requires the certificate to be active (not pending/disabled/
// already expired — there's no balance left on an expired certificate to
// transfer), the amount to be no more than what's actually on the
// certificate, and a registered customer account to receive the credit
// (looked up by recipient email — never trusted from the client). All three
// are validation failures rather than API errors.
//
// This is two independent API calls with no shared transaction: the
// certificate is debited first, then the customer is credited. Ordering it
// this way means a failure on the *second* call leaves the certificate
// already debited with nothing credited yet — worse for the customer than
// the reverse order, but it avoids ever creating store credit that isn't
// backed by an actual debit, which is the more dangerous failure mode (an
// admin can always manually grant a missed credit; reclaiming an
// over-granted one is a much harder conversation). If the second call does
// fail, one compensating call attempts to restore the certificate's prior
// balance/status; if that also fails, the error message says exactly what
// state was left so it can be reconciled by hand.
export async function transferGiftCertificateBalanceToStoreCredit(
  id: number | string,
  amount: number,
  storeHash: string | undefined,
): Promise<ActionResult> {
  const giftCertificate = await fetchGiftCertificate(id, storeHash);

  if (giftCertificate.status !== "active") {
    return { success: false, message: "Only active gift certificates can be transferred to store credit." };
  }

  if (amount > giftCertificate.balance) {
    return { success: false, message: "Transfer amount cannot exceed the current gift certificate balance." };
  }

  const { items: customers } = await fetchCustomersByEmail([giftCertificate.to_email], storeHash);
  const customer = customers.find((item) => item.email.toLowerCase() === giftCertificate.to_email.toLowerCase());

  if (!customer) {
    return { success: false, message: "The gift certificate recipient has no registered customer account." };
  }

  const previousBalance = giftCertificate.balance;
  const previousStatus = giftCertificate.status;

  await debitGiftCertificateForTransfer(giftCertificate, amount, storeHash);

  try {
    await addToCustomerStoreCredit(customer, amount, storeHash);
  } catch {
    try {
      await restoreGiftCertificateBalance(giftCertificate, previousBalance, previousStatus, storeHash);
    } catch {
      // Only the certificate was actually mutated (the debit) — the customer
      // credit never succeeded, so there's no customer tag to invalidate here.
      updateTag(giftCertificateTag(id));

      return {
        success: false,
        message: `Critical: gift certificate ${id} was debited ${amount} but the store credit grant to customer ${customer.id} failed, and reverting the certificate also failed. Manual reconciliation is required.`,
      };
    }

    updateTag(giftCertificateTag(id));

    return {
      success: false,
      message: "The store credit grant failed, but the gift certificate balance was restored. No changes were made.",
    };
  }

  // Both resources were mutated on the success path, so both tags need
  // invalidating: the certificate's own balance/status, and this customer's
  // store credit balance shown on their detail page.
  updateTag(giftCertificateTag(id));
  updateTag(customerTag(customer.id));

  return { success: true, message: "Gift certificate balance transferred to store credit." };
}
