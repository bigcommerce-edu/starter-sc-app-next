import { StoreNotInstalledError } from "@/lib/bc-auth/errors";
import { parseStoreHash, verifySignedPayload } from "@/lib/bc-auth/verify-signed-payload";
import { getCredentialsStore } from "@/lib/credentials-store/get-credentials-store";
import { upsertSessionStore } from "@/lib/session/session-cookie";

export interface LoadStoreResult {
  storeHash: string;
  // Deep link to redirect to after a successful load; defaults to "/".
  url: string;
}

// The /load (launch) callback's business logic: verify the signed request,
// confirm the store is still installed (throws StoreNotInstalledError
// otherwise), provision this user if they're new to the store, then
// establish/extend their session. Throws whatever verifySignedPayload
// throws on a bad/expired JWT; the /load route decides what each becomes.
export async function loadStore(signedPayloadJwt: string): Promise<LoadStoreResult> {
  const payload = await verifySignedPayload(signedPayloadJwt);
  const storeHash = parseStoreHash(payload.sub);
  const credentialsStore = getCredentialsStore();
  const token = await credentialsStore.getStoreToken(storeHash);

  if (!token) {
    throw new StoreNotInstalledError(storeHash);
  }

  await credentialsStore.setUser({ userId: payload.user.id, email: payload.user.email });
  await credentialsStore.setStoreUser({ storeHash, userId: payload.user.id });
  await upsertSessionStore(payload.user.id, storeHash);

  return { storeHash, url: payload.url ?? "/" };
}
