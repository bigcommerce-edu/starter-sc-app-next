import { cacheLife, cacheTag } from "next/cache";
import { getCredentialsStore } from "@/lib/credentials-store/get-credentials-store";

// One shared cache tag per store — there's only one App Extension this app
// ever registers, so no need for a per-extension-id tag the way
// giftCertificateTag/customerTag are per-record. Exported so the retry
// action (see components/gift-certs-manager/app-extension-status-banner/actions/retry-app-extension-registration.ts)
// can updateTag it the moment a retry succeeds, rather than waiting out the
// cacheLife below.
export function appExtensionStatusTag(storeHash: string): string {
  return `app-extension-status:${storeHash}`;
}

async function fetchStoreExtensionStatus(storeHash: string): Promise<{ isRegistered: boolean }> {
  "use cache";
  cacheLife("extended");
  cacheTag(appExtensionStatusTag(storeHash));

  const extensionId = await getCredentialsStore().getStoreExtension(storeHash);

  return { isRegistered: Boolean(extensionId) };
}

// Whether this app's App Extension is registered for the given store —
// used only to decide whether AppExtensionStatusBanner renders (see
// components/gift-certs-manager/app-extension-status-banner/index.tsx).
// This is non-critical, cosmetic-banner data (never blocks a page render — the
// banner is a client component that fetches this via its own API route), so
// it's cached with the longer "extended" lifetime rather than "standard":
// a stale "registered" reading for up to 10 minutes after a background fix
// is an acceptable tradeoff for not hitting storage on every page load.
//
// MOCK/STATIC modes never run an install flow, so no store_extensions row
// is ever written for them — storeHash undefined (or, equivalently, those
// modes) always reports "registered" so the banner never renders outside
// MULTITENANT.
export async function fetchAppExtensionStatus(storeHash: string | undefined): Promise<{ isRegistered: boolean }> {
  if (!storeHash) {
    return { isRegistered: true };
  }

  return fetchStoreExtensionStatus(storeHash);
}
