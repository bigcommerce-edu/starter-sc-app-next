"use server";

import { revalidatePath } from "next/cache";
import { getDataMode } from "@/lib/api-client/get-api-client";
import { getStoreCredentials } from "@/lib/api-client/store-credentials";
import { ActionResult } from "@/lib/actions/action-result";
import {
  fetchGiftCertificate,
  refillGiftCertificateBalance as refillGiftCertificateBalanceRequest,
  updateGiftCertificateStatus as updateGiftCertificateStatusRequest,
} from "@/lib/gift-certs-manager/gift-certificates/gift-certificates-api";
import { GiftCertificateStatus } from "@/lib/gift-certs-manager/gift-certificates/types";
import { getAppUrl } from "@/lib/routing/app-url";

export async function updateGiftCertificateStatus(
  id: number | string,
  status: GiftCertificateStatus,
  urlStoreHash: string | undefined,
): Promise<ActionResult> {
  const apiCredentials = getStoreCredentials(urlStoreHash);

  // The caller only supplies id/status — every other field used to build the
  // update request (and any future validation against the certificate's real
  // state) comes from this fresh fetch, never from client-supplied data.
  const giftCertificate = await fetchGiftCertificate(id, apiCredentials);

  await updateGiftCertificateStatusRequest(giftCertificate, status, apiCredentials);

  // TODO: switch to revalidateTag once the detail page's fetch is cached
  // (e.g. via `use cache`) with a tag — revalidatePath is the coarser tool
  // available today, since nothing is cached yet for a tag to attach to.
  revalidatePath(getAppUrl(urlStoreHash, `/gift-certs/${id}`));

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
  urlStoreHash: string | undefined,
): Promise<ActionResult> {
  const apiCredentials = getStoreCredentials(urlStoreHash);
  const giftCertificate = await fetchGiftCertificate(id, apiCredentials);

  if (giftCertificate.status !== "active" && giftCertificate.status !== "expired") {
    return { success: false, message: "Only active or expired gift certificates can be refilled." };
  }

  if (newBalance > giftCertificate.amount) {
    return { success: false, message: "Refill balance cannot exceed the original gift certificate amount." };
  }

  await refillGiftCertificateBalanceRequest(giftCertificate, newBalance, apiCredentials);

  revalidatePath(getAppUrl(urlStoreHash, `/gift-certs/${id}`));

  return { success: true, message: "Gift certificate balance refilled." };
}

export async function addToGiftCertificateBalance(id: number | string, amount: number): Promise<ActionResult> {
  // eslint-disable-next-line no-console
  console.log(`(noop) add ${amount} to gift certificate ${id} balance`);

  return { success: true, message: "Amount added to gift certificate balance." };
}

export async function transferGiftCertificateBalanceToStoreCredit(
  id: number | string,
  amount: number,
): Promise<ActionResult> {
  // eslint-disable-next-line no-console
  console.log(`(noop) transfer ${amount} from gift certificate ${id} to store credit`);

  return { success: true, message: "Gift certificate balance transferred to store credit." };
}
