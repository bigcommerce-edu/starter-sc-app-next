import { parseStoreHash, verifySignedPayload } from "@/lib/bc-auth/verify-signed-payload";
import { getCredentialsStore } from "@/lib/credentials-store/get-credentials-store";

// Verifies the /uninstall callback's signed request and deletes everything
// stored for that store — its token, and any users left with no other store
// association (see CredentialsStore.deleteStore) — rather than leaving stale
// rows behind. Throws whatever verifySignedPayload throws on a bad/expired
// JWT; the caller (the /uninstall route) decides what HTTP status that
// becomes (a failed verification should not be treated as a no-op success).
export async function uninstallStore(signedPayloadJwt: string): Promise<void> {
  const payload = await verifySignedPayload(signedPayloadJwt);
  const storeHash = parseStoreHash(payload.sub);

  await getCredentialsStore().deleteStore(storeHash);
}
