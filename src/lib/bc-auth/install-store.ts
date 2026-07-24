import { exchangeCodeForToken } from "@/lib/bc-auth/exchange-code-for-token";
import { InstallSaveFailedError } from "@/lib/bc-auth/errors";
import { parseStoreHash } from "@/lib/bc-auth/verify-signed-payload";
import { getCredentialsStore } from "@/lib/credentials-store/get-credentials-store";
import { upsertSessionStore } from "@/lib/session/session-cookie";
import { logError } from "@/lib/errors/logger";

export interface InstallStoreParams {
  code: string;
  context: string;
  scope: string;
  redirectUri: string;
}

export interface InstallStoreResult {
  storeHash: string;
  accessToken: string;
}

// The /auth (install) callback's business logic: exchange the code for a
// store-scoped token, persist the admin/store/store-user link (in that
// order — the Postgres schema's foreign keys require it), then establish
// the admin's session. Idempotent — re-installing an already-known store
// just replaces its token/scope. Throws TokenExchangeFailedError (from
// exchangeCodeForToken) or InstallSaveFailedError (if persisting a
// successful exchange fails); the /auth route decides what each becomes.
//
// Agnostic single-click-app plumbing — knows nothing about any specific app
// extension. Returns accessToken (not just storeHash) so the /auth route
// can register its own App Extension using this handshake's token directly.
export async function installStore(params: InstallStoreParams): Promise<InstallStoreResult> {
  const tokenResponse = await exchangeCodeForToken(params);
  const storeHash = parseStoreHash(tokenResponse.context);
  const credentialsStore = getCredentialsStore();

  // No transaction spans these four writes, so a failure partway through
  // can leave partial state (recoverable — a retried install replaces/adds
  // the missing rows) — logged so which step failed is visible.
  try {
    await credentialsStore.setUser({
      userId: tokenResponse.user.id,
      email: tokenResponse.user.email,
    });
    await credentialsStore.setStore({
      storeHash,
      accessToken: tokenResponse.access_token,
      scope: tokenResponse.scope,
      adminUserId: tokenResponse.user.id,
    });
    await credentialsStore.setStoreUser({ storeHash, userId: tokenResponse.user.id });

    await upsertSessionStore(tokenResponse.user.id, storeHash);
  } catch (error) {
    logError(`installStore: store "${storeHash}"`, error);
    throw new InstallSaveFailedError({ cause: error });
  }

  return { storeHash, accessToken: tokenResponse.access_token };
}
