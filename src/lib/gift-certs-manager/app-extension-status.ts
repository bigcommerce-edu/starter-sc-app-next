import { cacheLife, cacheTag } from "next/cache";
import { getCredentialsStore } from "@/lib/credentials-store/get-credentials-store";

// One shared tag per store (only one extension is ever registered). Exported
// so the retry action can updateTag it the moment a retry succeeds.
export function appExtensionStatusTag(storeHash: string): string {
  return `app-extension-status:${storeHash}`;
}

async function fetchStoreExtensionStatus(storeHash: string): Promise<{ isRegistered: boolean }> {
  "use cache: remote";
  cacheLife("extended");
  cacheTag(appExtensionStatusTag(storeHash));

  const extensionId = await getCredentialsStore().getStoreExtension(storeHash);

  return { isRegistered: Boolean(extensionId) };
}

// Whether this app's App Extension is registered — decides whether
// AppExtensionStatusBanner renders. Non-critical cosmetic data, so it's
// cached with the longer "extended" lifetime rather than "standard".
//
// MOCK/STATIC never run an install flow, so storeHash undefined always
// reports "registered" and the banner never renders outside MULTITENANT.
export async function fetchAppExtensionStatus(storeHash: string | undefined): Promise<{ isRegistered: boolean }> {
  if (!storeHash) {
    return { isRegistered: true };
  }

  return fetchStoreExtensionStatus(storeHash);
}
