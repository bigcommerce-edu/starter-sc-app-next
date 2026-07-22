import { exchangeCodeForToken } from "@/lib/bc-auth/exchange-code-for-token";
import { parseStoreHash } from "@/lib/bc-auth/verify-signed-payload";
import { getCredentialsStore } from "@/lib/credentials-store/get-credentials-store";
import { upsertSessionStore } from "@/lib/session/session-cookie";

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

// The full /auth (install) callback's business logic: exchange the
// authorization code for a store-scoped token, then persist the installing
// admin, the store, and their store-user link — in that order, sequentially,
// not in parallel, since the Postgres driver's schema enforces foreign keys
// in the child-references-parent direction (store_users.user_id and
// stores.admin_user_id both reference users.user_id; store_users.store_hash
// references stores.store_hash — see postgres-driver/migrations/0001_initial_schema.sql):
// setUser must land before setStore, which must land before setStoreUser, or
// a fresh Postgres install would fail its own foreign key checks. Then
// establishes (or extends) this admin's session. Idempotent — re-installing
// an already-known store just replaces its token/scope (see
// CredentialsStore.setStore), and upsertSessionStore is itself idempotent
// for the same reason. Throws whatever exchangeCodeForToken throws on a
// failed exchange; the caller (the /auth route) decides what HTTP status
// that becomes.
//
// This is agnostic single-click-app plumbing — it knows nothing about any
// specific app extension. Returns accessToken (not just storeHash) so the
// /auth route can register a Gift Certificates Manager-specific App
// Extension using this handshake's token directly, without a redundant
// storage round-trip — see app/api/app/auth/route.ts and
// lib/gift-certs-manager/register-app-extension.ts.
export async function installStore(params: InstallStoreParams): Promise<InstallStoreResult> {
  const tokenResponse = await exchangeCodeForToken(params);
  const storeHash = parseStoreHash(tokenResponse.context);
  const credentialsStore = getCredentialsStore();

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

  return { storeHash, accessToken: tokenResponse.access_token };
}
