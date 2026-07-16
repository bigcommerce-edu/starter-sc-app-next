import { parseStoreHash, verifySignedPayload } from "@/lib/bc-auth/verify-signed-payload";
import { getCredentialsStore } from "@/lib/credentials-store/get-credentials-store";

// The full /uninstall callback's business logic: verify the signed request,
// then delete everything stored for the store — its token, and any users
// left with no other store association (see CredentialsStore.deleteStore)
// — rather than leaving stale rows behind. Throws whatever
// verifySignedPayload throws on a bad/expired JWT; the caller (the
// /uninstall route) decides what HTTP status that becomes (a failed
// verification should not be treated as a no-op success).
//
// This app's App Extension is registered at install time (see
// lib/gift-certs-manager/register-app-extension.ts), but nothing here
// deregisters it — BigCommerce confirmed App Extensions are automatically
// cleaned up when the app is uninstalled, so this app doesn't duplicate
// that with its own deleteAppExtension call.
export async function uninstallStore(signedPayloadJwt: string): Promise<void> {
  const payload = await verifySignedPayload(signedPayloadJwt);
  const storeHash = parseStoreHash(payload.sub);

  await getCredentialsStore().deleteStore(storeHash);
}
