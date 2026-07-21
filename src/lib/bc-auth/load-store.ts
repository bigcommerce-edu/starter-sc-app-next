import { StoreNotInstalledError } from "@/lib/bc-auth/errors";
import { parseStoreHash, verifySignedPayload } from "@/lib/bc-auth/verify-signed-payload";
import { getCredentialsStore } from "@/lib/credentials-store/get-credentials-store";
import { upsertSessionStore } from "@/lib/session/session-cookie";

export interface LoadStoreResult {
  storeHash: string;
}

// The full /load (launch) callback's business logic: verify the signed
// request, confirm the store is actually installed (throws
// StoreNotInstalledError otherwise — a stale launch for an uninstalled
// store shouldn't proceed with no token), provision this user if they're
// new to the store (a second admin who never went through /auth would
// otherwise have no users/store_users row at all), then establish (or
// extend) this user's session — the same admin launching a second store
// gets that store appended to their existing session rather than a
// separate one, which is what lets them operate in multiple stores
// concurrently (e.g. separate browser tabs). Throws whatever
// verifySignedPayload throws on a bad/expired JWT; the caller (the /load
// route) decides what HTTP status each failure becomes.
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

  return { storeHash };
}
