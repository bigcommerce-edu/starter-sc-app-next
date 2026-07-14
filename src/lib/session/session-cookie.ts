import { cookies } from "next/headers";
import { cache } from "react";
import { signSession, verifySession } from "@/lib/session/session-jwt";
import { SessionPayload, SESSION_COOKIE_NAME } from "@/lib/session/types";

// SameSite=None + Secure + Partitioned (CHIPS) are all required for this
// cookie to work at all inside the BigCommerce control panel's cross-origin
// iframe. httpOnly keeps the session JWT (identity only, never the store
// access token) out of reach of any client-side script.
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: "none" as const,
  partitioned: true,
  path: "/",
};

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
// MULTITENANT request — potentially once from the (authenticated) layout
// and again from a Server Action in the same request — so this avoids
// re-verifying the same JWT repeatedly.
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

  cookieStore.set(SESSION_COOKIE_NAME, jwt, COOKIE_OPTIONS);
}
