import { cache } from "react";
import { getDataMode, resolveApiToken } from "@/lib/bc-api-client/get-rest-api-client";
import { getCredentialsStore } from "@/lib/credentials-store/get-credentials-store";
import { readSession, removeSessionStore } from "@/lib/session/session-cookie";

// Cached by React's per-request memoization, same rationale as
// resolveApiToken (see get-rest-api-client.ts) — keyed on (storeHash,
// userId) here rather than storeHash alone, since unlike resolveApiToken
// this check is inherently session-specific and never crosses a `use cache`
// boundary. CredentialsStore's other methods are deliberately left
// unmemoized at the interface level (most are mutations, where memoizing
// would be actively wrong) — this wraps just the one read that
// isAuthorizedForStore needs cached, rather than baking request-caching
// into the generic interface.
const isStoreUserLinked = cache((storeHash: string, userId: number): Promise<boolean> => {
  return getCredentialsStore().isStoreUserLinked(storeHash, userId);
});

// Whether the current session is authorized to act on the given store —
// called from two kinds of places that can't rely on each other: each
// page's own AuthorizedPage wrapper (see e.g.
// app/[storeHash]/gift-certs/page.tsx) and every mutating Server Action in
// actions.ts (directly POST-able, so each must re-verify on its own). There
// is deliberately no shared (authenticated) layout doing this check once
// for every page beneath it — a layout's render is skippable by Next's
// client Router Cache on a same-layout client-side navigation (only the
// changed page segment is guaranteed to re-render), so a layout-level check
// is not a reliable enforcement point; each page must check for itself. Per
// Next.js's own guidance, neither a layout's nor a page's check extends to
// Server Actions either way, since they're directly POST-able independent
// of any page render — see
// https://nextjs.org/docs/app/guides/data-security#authentication-and-authorization.
// A pure check — returns a boolean rather than throwing or redirecting
// itself — so each caller decides its own failure handling (a page throws;
// a Server Action throws too, but could choose to return an ActionResult
// instead).
//
// Two-tier: the session cookie's authenticatedStores is only an optimistic
// claim, signed once and unrevocable before its own TTL expires — it can't
// reflect a store_users link removed after the cookie was issued (e.g. via
// /remove_user), so a stale cookie would otherwise keep granting access for
// up to an hour. This cheap cookie check is kept as a fast-reject path
// (worth it on its own, and intended to back a future proxy-level
// optimistic gate), but a pass here is provisional until the store_users
// link is confirmed to still exist against the credentials store — the
// actual source of truth.
//
// The link check (isStoreUserLinked, keyed on storeHash+userId — inherently
// session-specific) and the token check (resolveApiToken, keyed on storeHash
// alone — see its own doc comment for why userId can never join that key)
// are two separate calls run via Promise.all rather than one joined query:
// a synchronous driver like the local SQLite one gets no wall-clock benefit
// from that (node:sqlite has no concurrent I/O to overlap), but a real
// network-backed production driver (Postgres/D1) can genuinely run both
// round-trips concurrently rather than paying their latency serially. Both
// calls are request-memoized (see isStoreUserLinked's and resolveApiToken's
// own cache() wrapping), so calling this more than once in the same
// request never re-queries beyond what each already avoids on its own
// (a Server Action's invocation is always its own separate request, so it
// never shares a cache() scope with the page render that led to it —
// there's nothing to reuse there, only within one render/action itself);
// resolveApiToken in particular is the same call (and cache() entry)
// getRestApiClient's data-fetching call sites make later in the same page
// render, so this check effectively pre-warms that lookup for free rather
// than duplicating it.
//
// A confirmed-stale cookie claim is corrected here via removeSessionStore,
// so a revoked store stops passing the fast cookie check on the next
// request rather than only self-correcting once the JWT expires. That write
// only succeeds when this is called from a Server Action (cookies().set()
// throws outside of one); the try/catch below makes the attempt a no-op
// when called during a page's render instead of also crashing that render
// over an unrelated Next.js constraint.
//
// This unavoidably makes at least one DB round-trip (the store_users link
// check) part of every page render and every Server Action, since there's
// no way to confirm a live revocation without asking the credentials
// store — a purely cookie-based check could only ever be as fresh as the
// JWT's own TTL, and (as covered above) can't be confined to just a
// shared layout's render if it needs to actually run on every navigation.
//
// MOCK/STATIC have no real session/store concept (see get-rest-api-client.ts)
// — there's nothing to authorize in those modes, so this trivially passes.
export async function isAuthorizedForStore(storeHash: string | undefined): Promise<boolean> {
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
      // Not callable during a page's plain render — see this function's own
      // doc comment. The next Server Action call from this same stale
      // session will retry the write.
    }
  }

  return isAuthorized;
}
