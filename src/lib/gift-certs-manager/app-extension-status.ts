import { getCredentialsStore } from "@/lib/credentials-store/get-credentials-store";

// Not cached: this reads the credentials store directly rather than through
// fetch(), so there's nothing for fetch-level caching to hook into. Fine here
// — it's a single indexed lookup, and the banner polls it with
// cache: "no-store" so a registration retry shows up immediately.
async function fetchStoreExtensionStatus(storeHash: string): Promise<{ isRegistered: boolean }> {
  const extensionId = await getCredentialsStore().getStoreExtension(storeHash);

  return { isRegistered: Boolean(extensionId) };
}

// Whether this app's App Extension is registered — decides whether
// AppExtensionStatusBanner renders.
//
// MOCK/STATIC never run an install flow, so storeHash undefined always
// reports "registered" and the banner never renders outside MULTITENANT.
export async function fetchAppExtensionStatus(storeHash: string | undefined): Promise<{ isRegistered: boolean }> {
  if (!storeHash) {
    return { isRegistered: true };
  }

  return fetchStoreExtensionStatus(storeHash);
}
