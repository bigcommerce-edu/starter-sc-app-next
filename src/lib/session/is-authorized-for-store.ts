import { cache } from "react";
import { connection } from "next/server";
import { getDataMode, resolveApiToken } from "@/lib/bc-api-client/resolve-store-credentials";
import { getCredentialsStore } from "@/lib/credentials-store/get-credentials-store";
import { readSession, removeSessionStore } from "@/lib/session/session-cookie";

// Memoized per request, keyed on (storeHash, userId) since this check is
// inherently session-specific.
const isStoreUserLinked = cache((storeHash: string, userId: number): Promise<boolean> => {
  return getCredentialsStore().isStoreUserLinked(storeHash, userId);
});

// Shared across every caller (AuthorizedPage, Server Actions, the
// app-extension-status route) so the wording only needs to change in one
// place.
export const NOT_AUTHORIZED_FOR_STORE_MESSAGE = "Not authorized for this store.";

// Secondary, authoritative authorization check — proxy.ts is the primary
// gate; see docs/ARCHITECTURE.md for the full two-tier design. Called from
// each page's AuthorizedPage wrapper and every Server Action, since neither
// a shared layout nor the proxy alone is a reliable enforcement point (a
// layout's render is skippable by Next's Router Cache; Server Actions are
// directly POST-able independent of any page render). Returns a boolean
// rather than throwing/redirecting, so each caller decides its own failure
// handling.
//
// The session cookie's authenticatedStores claim is checked first and
// cheaply; a pass there is provisional until isStoreUserLinked confirms the
// link still exists. That link check and resolveApiToken's token lookup run
// concurrently via Promise.all — both are request-memoized via cache().
//
// A confirmed-stale cookie claim is corrected via removeSessionStore, so a
// revoked store stops passing the fast cookie check on the next request.
// That write only succeeds from a Server Action (cookies().set() throws
// during a plain render), so the try/catch below just no-ops in that case.
//
// MOCK/STATIC have no real session/store concept, so this trivially passes.
export async function isAuthorizedForStore(storeHash: string | undefined): Promise<boolean> {
  // Forces this render path to be dynamic unconditionally — otherwise
  // Next's build-time prerender only discovers the dynamic dependency
  // (cookies(), via readSession() below) if it happens to take the
  // MULTITENANT branch.
  await connection();

  if (getDataMode() !== "MULTITENANT") {
    return true;
  }

  if (!storeHash) {
    return false;
  }

  const session = await readSession();

  if (!session?.authenticatedStores.includes(storeHash)) {
    return false;
  }

  const [isLinked, apiToken] = await Promise.all([
    isStoreUserLinked(storeHash, session.userId),
    resolveApiToken(storeHash),
  ]);

  const isAuthorized = isLinked && Boolean(apiToken);

  if (!isAuthorized) {
    try {
      await removeSessionStore(storeHash);
    } catch {
      // Not callable during a plain render; the next Server Action from
      // this same stale session will retry the write.
    }
  }

  return isAuthorized;
}
