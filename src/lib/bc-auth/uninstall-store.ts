import { parseStoreHash, verifySignedPayload } from "@/lib/bc-auth/verify-signed-payload";
import { getCredentialsStore } from "@/lib/credentials-store/get-credentials-store";

// Verifies the /uninstall callback's signed request and resolves which
// store it's for. Split from deleteInstalledStore below so the /uninstall
// route can run app-extension-specific cleanup (a Gift Certificates
// Manager concern — see lib/gift-certs-manager/deregister-app-extension.ts)
// in between verification and deletion, without this agnostic module
// needing to know that step exists. Throws whatever verifySignedPayload
// throws on a bad/expired JWT; the caller (the /uninstall route) decides
// what HTTP status that becomes (a failed verification should not be
// treated as a no-op success).
export async function verifyUninstallRequest(signedPayloadJwt: string): Promise<{ storeHash: string }> {
  const payload = await verifySignedPayload(signedPayloadJwt);

  return { storeHash: parseStoreHash(payload.sub) };
}

// Deletes everything stored for the store — its token, and any users left
// with no other store association (see CredentialsStore.deleteStore) —
// rather than leaving stale rows behind. Must run after any cleanup that
// still needs the store's token or other now-to-be-deleted data (e.g.
// deregisterAppExtension, which needs both the token and the
// store_extensions row this removes) — see app/api/app/uninstall/route.ts
// for the full sequencing.
export async function deleteInstalledStore(storeHash: string): Promise<void> {
  await getCredentialsStore().deleteStore(storeHash);
}
