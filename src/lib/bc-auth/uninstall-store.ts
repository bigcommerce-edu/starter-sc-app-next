import { deregisterAppExtension } from "@/lib/bc-auth/deregister-app-extension";
import { parseStoreHash, verifySignedPayload } from "@/lib/bc-auth/verify-signed-payload";
import { getCredentialsStore } from "@/lib/credentials-store/get-credentials-store";

// The full /uninstall callback's business logic: verify the signed request,
// remove this app's App Extension (if one was ever registered — see
// deregisterAppExtension), then delete everything stored for the store —
// its token, and any users left with no other store association (see
// CredentialsStore.deleteStore) — rather than leaving stale rows behind.
// deregisterAppExtension must run before deleteStore: it needs the store's
// token (to authenticate the deleteAppExtension mutation) and its
// store_extensions row (to know the extension id), both of which deleteStore
// removes. Throws whatever verifySignedPayload throws on a bad/expired JWT;
// the caller (the /uninstall route) decides what HTTP status that becomes
// (a failed verification should not be treated as a no-op success).
export async function uninstallStore(signedPayloadJwt: string): Promise<void> {
  const payload = await verifySignedPayload(signedPayloadJwt);
  const storeHash = parseStoreHash(payload.sub);

  await deregisterAppExtension(storeHash);
  await getCredentialsStore().deleteStore(storeHash);
}
