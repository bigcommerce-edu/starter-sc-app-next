import { cookies } from "next/headers";
import { cache } from "react";
import { signSession, verifySession } from "@/lib/session/session-jwt";
import { SessionPayload, SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS } from "@/lib/session/types";

// Reads and verifies the current session cookie, if any. A missing cookie
// and a failed verification (expired, bad signature, wrong shape) are
// treated identically — both just mean "not authenticated" to callers,
// which don't need to distinguish why.
async function readUncachedSession(): Promise<SessionPayload | undefined> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!raw) {
    return undefined;
  }

  try {
    return await verifySession(raw);
  } catch {
    return undefined;
  }
}

// Memoized per request (same rationale as getCachedRestApiClient/
// getCachedCredentialsStore): isAuthorizedForStore calls this on every
// MULTITENANT request, and a single page render can call it more than once
// (e.g. a page's own auth check plus something else reading the session) —
// so this avoids re-verifying the same JWT repeatedly within that request.
const getCachedSession = cache(readUncachedSession);

// Reads and verifies the current session cookie, if any — see
// readUncachedSession for what "reads and verifies" means. Callers should
// always go through this rather than readUncachedSession directly, so
// repeated reads in one request share a single verification.
export async function readSession(): Promise<SessionPayload | undefined> {
  return getCachedSession();
}

// Called from /auth and /load: mints a new session cookie for this user if
// none exists (or the existing one belongs to a different user), seeded
// with just this store; otherwise idempotently appends this store to the
// existing same-user session's authenticatedStores list. This is the
// entire "create-or-append" logic both callbacks need — neither route
// needs to know which case applied.
export async function upsertSessionStore(userId: number, storeHash: string): Promise<void> {
  const existing = await readSession();
  const authenticatedStores =
    existing && existing.userId === userId
      ? Array.from(new Set([...existing.authenticatedStores, storeHash]))
      : [storeHash];

  const jwt = await signSession({ userId, authenticatedStores });
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, jwt, SESSION_COOKIE_OPTIONS);
}

// Called by isAuthorizedForStore when the session cookie's optimistic
// authenticatedStores claim turns out to be stale — the store_users link it
// implies no longer actually exists (e.g. removed via /remove_user after
// this cookie was issued). Re-signs the cookie without storeHash so the
// cheap cookie-only fast path in isAuthorizedForStore stops claiming this
// store on every subsequent request, rather than only self-correcting once
// the JWT's own TTL expires. A no-op if there's no session, or the session
// never claimed this store in the first place.
//
// Like upsertSessionStore, this calls cookies().set() — callable only from a
// Server Action or Route Handler, never from a plain render. isAuthorizedForStore
// is called from both a page's own render and from Server Actions, so it
// wraps this call in a try/catch: the write throws (and is silently
// skipped) when called during a page's render, and succeeds when called
// from a Server Action.
export async function removeSessionStore(storeHash: string): Promise<void> {
  const existing = await readSession();

  if (!existing || !existing.authenticatedStores.includes(storeHash)) {
    return;
  }

  const authenticatedStores = existing.authenticatedStores.filter((existingStoreHash) => existingStoreHash !== storeHash);
  const jwt = await signSession({ userId: existing.userId, authenticatedStores });
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, jwt, SESSION_COOKIE_OPTIONS);
}
