"use server";

import { ActionResult } from "@/lib/actions/action-result";
import { GiftCertificateStatus } from "@/lib/gift-certificates/types";

// Placeholder: once a real API client exists for STATIC/MULTITENANT modes,
// this should issue the actual status update request (and probably revalidate
// the detail page) instead of doing nothing.
export async function updateGiftCertificateStatus(
  id: number | string,
  status: GiftCertificateStatus,
): Promise<ActionResult> {
  // eslint-disable-next-line no-console
  console.log(`(noop) update gift certificate ${id} status to "${status}"`);

  return { success: true, message: "Gift certificate status updated." };
}

// Placeholder: once a real API client exists, this should trigger the actual
// resend request instead of doing nothing.
export async function resendGiftCertificateEmail(id: number | string): Promise<ActionResult> {
  // eslint-disable-next-line no-console
  console.log(`(noop) re-send gift certificate ${id} email`);

  return { success: true, message: "Gift certificate email re-sent." };
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
