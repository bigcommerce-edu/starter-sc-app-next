"use server";

import { GiftCertificateStatus } from "@/lib/gift-certificates/types";

// Placeholder: once a real API client exists for STATIC/MULTITENANT modes,
// this should issue the actual status update request (and probably revalidate
// the detail page) instead of doing nothing.
export async function updateGiftCertificateStatus(
  id: number | string,
  status: GiftCertificateStatus,
): Promise<void> {
  // eslint-disable-next-line no-console
  console.log(`(noop) update gift certificate ${id} status to "${status}"`);
}

// Placeholders for the three balance actions. All will eventually issue a
// real API request (and likely revalidate the detail page) instead of doing
// nothing.
export async function refillGiftCertificateBalance(id: number | string, newBalance: number): Promise<void> {
  // eslint-disable-next-line no-console
  console.log(`(noop) refill gift certificate ${id} to a balance of ${newBalance}`);
}

export async function addToGiftCertificateBalance(id: number | string, amount: number): Promise<void> {
  // eslint-disable-next-line no-console
  console.log(`(noop) add ${amount} to gift certificate ${id} balance`);
}

export async function transferGiftCertificateBalanceToStoreCredit(
  id: number | string,
  amount: number,
): Promise<void> {
  // eslint-disable-next-line no-console
  console.log(`(noop) transfer ${amount} from gift certificate ${id} to store credit`);
}
