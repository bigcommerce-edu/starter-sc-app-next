import { parseStoreHash, verifySignedPayload } from "@/lib/bc-auth/verify-signed-payload";
import { getCredentialsStore } from "@/lib/credentials-store/get-credentials-store";

// The full /remove_user callback's business logic: verify the signed
// request, then remove just that one user's access to the store (see
// CredentialsStore.deleteUser) — payload.user is the user being removed,
// not payload.owner (the store owner) — leaving the store and its other
// users untouched. Throws whatever verifySignedPayload throws on a
// bad/expired JWT; the caller (the /remove_user route) decides what HTTP
// status that becomes.
export async function removeStoreUser(signedPayloadJwt: string): Promise<void> {
  const payload = await verifySignedPayload(signedPayloadJwt);
  const storeHash = parseStoreHash(payload.sub);

  await getCredentialsStore().deleteUser(storeHash, payload.user.id);
}
