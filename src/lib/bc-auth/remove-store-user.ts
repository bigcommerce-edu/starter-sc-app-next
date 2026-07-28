import { parseStoreHash, verifySignedPayload } from "@/lib/bc-auth/verify-signed-payload";
import { getCredentialsStore } from "@/lib/credentials-store/get-credentials-store";

// The /remove_user callback's business logic: verify the signed request,
// then remove just that one user's access (payload.user, not payload.owner
// the store owner), leaving the store and its other users untouched.
export async function removeStoreUser(signedPayloadJwt: string): Promise<void> {
  const payload = await verifySignedPayload(signedPayloadJwt);
  const storeHash = parseStoreHash(payload.sub);

  await getCredentialsStore().deleteUser(storeHash, payload.user.id);
}
