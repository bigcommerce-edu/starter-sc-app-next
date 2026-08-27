import { getCredentialsStore } from "@/lib/credentials-store/get-credentials-store";

// Not cached. This reads the credentials store directly rather than going
// through fetch(), so the fetch-level caching the rest of the app uses (see
// lib/bc-api-client/cache-profiles.ts) has nothing to hook into — the old
// `use cache` boundary could wrap an arbitrary function, a fetch tag can't.
// Uncached is the right default here anyway: it's a single indexed lookup,
// and the banner polls it with cache: "no-store" so a registration retry is
// reflected immediately.
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
