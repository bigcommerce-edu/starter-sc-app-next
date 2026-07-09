"use server";

import { revalidatePath } from "next/cache";
import { getDataMode } from "@/lib/api-client/get-api-client";
import { getStoreCredentials } from "@/lib/api-client/store-credentials";
import { ActionResult } from "@/lib/actions/action-result";
import { updateGiftCertificateStatus as updateGiftCertificateStatusRequest } from "@/lib/gift-certs-manager/gift-certificates/gift-certificates-api";
import { GiftCertificate, GiftCertificateStatus } from "@/lib/gift-certs-manager/gift-certificates/types";
import { getAppUrl } from "@/lib/routing/app-url";

export async function updateGiftCertificateStatus(
  giftCertificate: GiftCertificate,
  status: GiftCertificateStatus,
  urlStoreHash: string | undefined,
): Promise<ActionResult> {
  const apiCredentials = getStoreCredentials(urlStoreHash);

  await updateGiftCertificateStatusRequest(giftCertificate, status, apiCredentials);

  // TODO: switch to revalidateTag once the detail page's fetch is cached
  // (e.g. via `use cache`) with a tag — revalidatePath is the coarser tool
  // available today, since nothing is cached yet for a tag to attach to.
  revalidatePath(getAppUrl(urlStoreHash, `/gift-certs/${giftCertificate.id}`));

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

// Placeholders for the three balance actions. All will eventually issue a
// real API request (and likely revalidate the detail page) instead of doing
// nothing.
export async function refillGiftCertificateBalance(id: number | string, newBalance: number): Promise<ActionResult> {
  // eslint-disable-next-line no-console
  console.log(`(noop) refill gift certificate ${id} to a balance of ${newBalance}`);

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
