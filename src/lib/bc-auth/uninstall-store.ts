import { parseStoreHash, verifySignedPayload } from "@/lib/bc-auth/verify-signed-payload";
import { getCredentialsStore } from "@/lib/credentials-store/get-credentials-store";

// Verifies the /uninstall callback's signed request and deletes everything
// stored for that store, rather than leaving stale rows behind.
export async function uninstallStore(signedPayloadJwt: string): Promise<void> {
  const payload = await verifySignedPayload(signedPayloadJwt);
  const storeHash = parseStoreHash(payload.sub);

  await getCredentialsStore().deleteStore(storeHash);
}
