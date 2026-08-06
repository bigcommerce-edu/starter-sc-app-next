import { cookies } from "next/headers";
import { signSession, verifySession } from "@/lib/session/session-jwt";
import { SessionPayload, SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS } from "@/lib/session/types";

// TODO: memoize this per request with cache()
//  - isAuthorizedForStore calls this on every MULTITENANT request, and a
//    single page render can call it more than once (e.g. a page's own auth
//    check plus something else reading the session) — memoizing avoids
//    re-verifying the same JWT repeatedly within that request
//  - split the body below into its own readUncachedSession function, then
//    wrap it: const getCachedSession = cache(readUncachedSession)
//  - readSession itself just becomes `return getCachedSession();`
//
// Reads and verifies the current session cookie, if any. A missing cookie
// and a failed verification (expired, bad signature, wrong shape) are
// treated identically — both just mean "not authenticated" to callers,
// which don't need to distinguish why.
export async function readSession(): Promise<SessionPayload | undefined> {
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

// Called from /auth and /load: mints a new session cookie for this user if
// none exists (or the existing one belongs to a different user), seeded
// with just this store; otherwise idempotently appends this store to the
// existing same-user session's authenticatedStores list. This is the
// entire "create-or-append" logic both callbacks need — neither route
// needs to know which case applied.
//
// issuedAt is preserved from the existing session (not reset to now) when
// appending a store, so re-launching into an additional store mid-session
// doesn't push back the absolute SESSION_MAX_AGE_SECONDS ceiling — only a
// genuinely new login (no existing same-user session) starts a fresh clock.
export async function upsertSessionStore(userId: number, storeHash: string): Promise<void> {
  const existing = await readSession();
  const isSameUser = existing && existing.userId === userId;
  const authenticatedStores = isSameUser
    ? Array.from(new Set([...existing.authenticatedStores, storeHash]))
    : [storeHash];
  const issuedAt = isSameUser ? existing.issuedAt : Math.floor(Date.now() / 1000);

  const jwt = await signSession({ userId, authenticatedStores, issuedAt });
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, jwt, SESSION_COOKIE_OPTIONS);
}

// Called by isAuthorizedForStore when the cookie's authenticatedStores claim
// turns out to be stale (the store_users link it implies no longer exists).
// Re-signs the cookie without storeHash so the cheap cookie-only fast path
// stops claiming this store on every subsequent request. A no-op if there's
// no session, or it never claimed this store. Only callable from a Server
// Action/Route Handler (cookies().set() throws during a plain render) — see
// isAuthorizedForStore's own try/catch around this call.
export async function removeSessionStore(storeHash: string): Promise<void> {
  const existing = await readSession();

  if (!existing || !existing.authenticatedStores.includes(storeHash)) {
    return;
  }

  const authenticatedStores = existing.authenticatedStores.filter((existingStoreHash) => existingStoreHash !== storeHash);
  const jwt = await signSession({ userId: existing.userId, authenticatedStores, issuedAt: existing.issuedAt });
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, jwt, SESSION_COOKIE_OPTIONS);
}
