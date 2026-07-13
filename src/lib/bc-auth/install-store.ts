import { exchangeCodeForToken } from "@/lib/bc-auth/exchange-code-for-token";
import { parseStoreHash } from "@/lib/bc-auth/verify-signed-payload";
import { getCredentialsStore } from "@/lib/credentials-store/get-credentials-store";

export interface InstallStoreParams {
  code: string;
  context: string;
  scope: string;
  redirectUri: string;
}

export interface InstallStoreResult {
  storeHash: string;
}

// The full /auth (install) callback's business logic: exchange the
// authorization code for a store-scoped token, then persist the store, the
// installing admin, and their store-user link. Idempotent — re-installing
// an already-known store just replaces its token/scope (see
// CredentialsStore.setStore). Throws whatever exchangeCodeForToken throws on
// a failed exchange; the caller (the /auth route) decides what HTTP status
// that becomes.
export async function installStore(params: InstallStoreParams): Promise<InstallStoreResult> {
  const tokenResponse = await exchangeCodeForToken(params);
  const storeHash = parseStoreHash(tokenResponse.context);
  const credentialsStore = getCredentialsStore();

  await credentialsStore.setStore({
    storeHash,
    accessToken: tokenResponse.access_token,
    scope: tokenResponse.scope,
    adminUserId: tokenResponse.user.id,
  });
  await credentialsStore.setUser({
    userId: tokenResponse.user.id,
    email: tokenResponse.user.email,
  });
  await credentialsStore.setStoreUser({ storeHash, userId: tokenResponse.user.id });

  // TODO: mint this admin's session cookie once session management exists,
  // rather than relying solely on the /auth route's redirect.

  return { storeHash };
}
