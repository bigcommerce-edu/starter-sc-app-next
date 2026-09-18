import { getCredentialsStore } from "@/lib/credentials-store/get-credentials-store";

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
