# Architecture

This is a starter Next.js app for building a BigCommerce single-click
installable app. The included feature (a gift certificates manager) is a
worked example — expect to remove `src/components/gift-certs-manager`,
`src/lib/gift-certs-manager`, and their routes when building a real app on
top of this starter, while keeping the auth/session/API-client/credentials
layers described below.

## Data modes

`DATA_MODE` (env var) selects one of three modes everywhere data is fetched:

- **MOCK** (default) — no real API calls; in-memory mock data; no
  authentication. Routes render under `app/(root)/*` (no store context).
- **STATIC** — real BigCommerce API calls, but against one store/token pair
  read from env vars (`STATIC_STORE_HASH`/`STATIC_STORE_TOKEN`). Also renders
  under `app/(root)/*`.
- **MULTITENANT** — the real production mode. Every request is scoped to a
  store via the `app/store/[storeHash]` route segment, authenticated through
  the full install/session flow described below.

`getDataMode()`/`resolveStoreHash()`/`resolveApiToken()`
(`lib/bc-api-client/resolve-store-credentials.ts`) are the single place this
branches; most other code doesn't need to know which mode is active.

## Install and session flow

BigCommerce calls this app back at four routes under `app/api/app/`:

- **`/auth`** — install callback. Exchanges the OAuth `code` for a
  store-scoped access token (`lib/bc-auth/exchange-code-for-token.ts`),
  persists the store/user/link (`lib/bc-auth/install-store.ts`), registers
  this app's App Extension, and mints a session cookie.
- **`/load`** — launch callback, fired on every subsequent open. Verifies
  BigCommerce's `signed_payload_jwt`, confirms the store is still installed,
  and mints/extends the session cookie.
- **`/remove_user`** / **`/uninstall`** — server-to-server callbacks (not
  browser-facing). Verify the JWT and delete the relevant credentials rows.

`/auth` and `/load` are navigated to directly inside the merchant's iframe,
so their failures redirect to `/app-error?reason=...` (a real page, not a
JSON body) rather than returning JSON — see `lib/bc-auth/app-error-reason.ts`
for the closed set of reasons and why `/auth`'s and `/load`'s fallback
reasons use different copy. `/remove_user` and `/uninstall` are called by
BigCommerce's backend directly, so they keep returning JSON.

### Session cookie

The app mints its own session: a short-lived (`SESSION_TTL_SECONDS`,
`lib/session/session-jwt.ts`), stateless JWT stored in an `httpOnly`,
`SameSite=None; Secure; Partitioned` cookie (required for the BigCommerce
control panel's cross-origin iframe). The payload is `{ userId,
authenticatedStores: string[] }` — a list, not a single store, so one admin
can be launched into multiple stores concurrently.

A stateless JWT can't be revoked before it expires, which is why the TTL is
kept short and why authorization is checked in two places (below) rather
than trusted from the cookie alone.

### Two-tier authorization

1. **`src/proxy.ts`** (primary, runs first) — a cheap, optimistic gate that
   verifies the cookie's JWT signature and its `authenticatedStores` claim
   against the URL's `storeHash`, with no DB access. Matches every route
   under `app/store/[storeHash]/` (see the file's own comment on why the
   matcher needs a literal `/store` prefix rather than a bare `:storeHash`).
   On success, it also re-signs the cookie with a fresh TTL — this is what
   makes the session's effective lifetime "since last request" rather than
   "since login," since BigCommerce can only mint a fresh session via
   `/load`, which this app has no way to trigger from inside its own iframe.
2. **`lib/session/is-authorized-for-store.ts`** (secondary, authoritative)
   — called by every page (via `AuthorizedPage`) and every Server Action.
   Confirms the store-user link still actually exists in the credentials
   store (the proxy can't do this — it has no DB access), correcting the
   session cookie if the link was revoked since the cookie was issued.

Passing the proxy is necessary but not sufficient; every protected page and
Server Action must still call `isAuthorizedForStore` itself, since a
layout's own check is skippable by Next's client Router Cache on a
same-layout client-side navigation, and neither a layout's nor a page's
check extends to Server Actions (they're directly POST-able).

A failed check redirects to `/unauthorized`, a plain top-level route with no
shell chrome — `AuthorizedPage` redirects rather than rendering inline
because `[storeHash]/layout.tsx` has already committed to rendering
`AppShell` around `children` by the time the check runs.

## Credentials storage

`lib/credentials-store/types.ts` defines `CredentialsStore` — stores,
users, store-user links, store-extension links — implemented by one driver
per backing DB:

- **SQLite** (`sqlite-driver/`) — local development, single-instance only.
- **Postgres** (`postgres-driver/`) — the real multi-instance driver (e.g.
  Vercel + Neon).

`CREDENTIALS_STORE_DRIVER` selects which one `get-credentials-store.ts`
returns. The Postgres driver is imported through
`postgres-driver-loader.ts`, not directly — `next.config.ts`'s
`turbopack.resolveAlias` swaps that specifier for a `pg`-free stub
(`postgres-driver-loader.unavailable.ts`) whenever the driver isn't
Postgres, so `pg` (which fails to bundle on some deployment targets, e.g.
Cloudflare Workers) is never compiled into a build that would never select
that branch anyway.

Every store method wraps its query in a helper that logs and re-throws a
sanitized `AppError("DATABASE", ...)` rather than letting a raw driver error
(which can embed connection detail) escape to a caller.

`setStore`/`setUser`/`setStoreUser`/`setStoreExtension` are all upserts
(`ON CONFLICT ... DO UPDATE`), since `/auth` re-running for an
already-installed store should replace its token/scope, not error or
duplicate rows. `deleteStore` (the `/uninstall` cascade) and `deleteUser`
(the `/remove_user` scope — one user, one store) both run inside a single
transaction and share a `deleteUsersWithNoRemainingStores` step: a
set-based `DELETE ... WHERE user_id = ANY($1) AND NOT EXISTS (...)`, rather
than a per-user count-then-delete loop, since by the time it runs the
relevant `store_users` rows are already gone and it only needs to ask "does
this user have any row left at all."

`isStoreUserLinked` is the authoritative half of `isAuthorizedForStore`'s
check (see above) — the session cookie's claim is optimistic; this confirms
the link still actually exists. It's a separate query from `getStoreToken`
(not one join) so each keeps a cache key matching what it's actually keyed
on — this by `(storeHash, userId)`, the token by `storeHash` alone — and the
two run concurrently via `Promise.all` in `isAuthorizedForStore`.

## BigCommerce API clients

`lib/bc-api-client/` has one client per BigCommerce API surface
(`rest-client/`, `graphql-client/`), each constructed per-request via
`get-rest-api-client.ts`/`get-graphql-api-client.ts` (memoized with React's
`cache()`, keyed on the resolved store hash).

- **Timeouts**: GET requests (and GraphQL queries) get a 10s
  `AbortSignal.timeout`. Mutations (POST/PUT/DELETE, and GraphQL calls
  passing `isMutation: true`) deliberately get none — aborting a client-side
  request doesn't cancel the write on BigCommerce's side, so timing out a
  mutation risks reporting failure for a write that actually succeeded.
- **Rate limiting**: `lib/bc-api-client/rate-limit.ts` reads BigCommerce's
  four `X-Rate-Limit-*` REST response headers (`Requests-Left`,
  `Requests-Quota`, `Time-Window-Ms`, `Time-Reset-Ms`) and proactively waits
  `Time-Reset-Ms` (never retries — it only delays returning an
  already-final response/error, so it's safe on mutations too) once
  `Requests-Left / Requests-Quota` drops below 20%. Proportional rather
  than a flat requests-left count, since the same absolute number means a
  different safety margin depending on BigCommerce's plan-based quota tier
  (Standard/Plus: 20,000/hr, Pro: 60,000/hr, Enterprise: custom). Not yet
  wired into the GraphQL client: these headers aren't documented for the
  GraphQL Admin API, though manual testing has shown they are in fact
  present on GraphQL responses today — left as a TODO pending BigCommerce
  engineering confirmation that this is guaranteed rather than incidental.
- **Errors**: both clients throw `AppError` (`lib/errors/app-error.ts`) with
  a safe, user-facing message; raw response detail goes into `cause` for
  logs only.

## Caching

This app uses Next's Cache Components (`cacheComponents: true`). Two
`cacheLife` profiles are configured: `standard` (5 min, most data) and
`extended` (10 min, slower-changing data like channels).

Data-fetching functions that back a page (e.g.
`fetchGiftCertificatesPage`) are `"use cache: remote"` and tag themselves
with both a shared list tag and a per-record tag (added after the fetch
resolves, once record ids are known). Mutations call `updateTag` on the
relevant tags so a change is visible immediately rather than waiting out
the `cacheLife`.

Pagination is stateless (BigCommerce's v2 gift certificates endpoint
reports no total count anywhere), so "is there a next page" is answered by
peeking one page ahead with the same page size — that peek uses
`fetchGiftCertificatesPage` itself, cached the same way, so if the user
actually clicks "next" the real fetch for that page hits the same cache
entry the peek already created instead of re-fetching.

Route Handlers that must never be cached by the browser (as opposed to
Next's own server-side cache) explicitly set `Cache-Control: no-store` — a
GET Route Handler's response is otherwise eligible for normal HTTP caching,
which is invisible to and not invalidated by `cacheTag`/`updateTag`.

## Error handling

`lib/errors/` is the shared error-handling foundation:

- **`AppError`** — a tagged error class (`code`, safe `message`, optional
  `cause`/`status`) used everywhere a raw error (driver, fetch, parse
  failure) needs to become something safe to show a user or return from a
  Server Action.
- **`logger.ts`** — the one place that writes to `console.error`/`warn`,
  gated by `ERROR_LOGGING_ENABLED` (on by default).
- **Server Actions** return `ActionResult` (`{ success, message }`) for
  every expected failure (auth, validation, upstream errors) rather than
  throwing — a thrown Server Action error has its message stripped to a
  generic digest by Next in production, which would silently discard any
  specific message.
- **Boundaries**: one `error.tsx` per real route segment
  (`app/(root)`, `app/store/[storeHash]`) plus a root `global-error.tsx` and
  root `not-found.tsx`. Data-access functions that might not find a record
  (e.g. `fetchCustomer`) return `undefined`/throw rather than calling
  `notFound()` themselves, since the same function can be called from a
  Server Action (where a 404 navigation would be wrong) as well as a page
  render — the calling page component makes that call.

## The gift certificates manager example

The included feature demonstrates a few patterns worth understanding even
though the feature itself is disposable:

### App Extension registration (idempotent)

`lib/gift-certs-manager/register-app-extension.ts`'s `findOrCreateAppExtension`
queries BigCommerce for an existing App Extension matching this app's own
URL before creating one. This matters because registration can run more
than once for the same store (a user-triggered retry after a partial
failure, or `/auth` re-running) — without the existing-extension check,
a retry would call `createAppExtension` again and either duplicate the menu
item or fail outright if the store is at its extension-per-app cap.
`registerAppExtension` (the install-time caller) deliberately never throws:
a failed registration shouldn't block install, since the app is still fully
usable without the menu shortcut. It's logged rather than silently
swallowed, since that's the only way to notice a store missing its
shortcut. A separate, user-triggered retry action
(`components/gift-certs-manager/app-extension-status-banner/`) shares the
same `findOrCreateAppExtension` call but surfaces success/failure to the UI
instead of swallowing it.

### Transfer-to-store-credit (no cross-API transaction)

`transferGiftCertificateBalanceToStoreCredit`
(`app/store/[storeHash]/gift-certs/[id]/actions.ts`) debits a gift
certificate and grants the same amount as store credit — two independent
BigCommerce API calls with no shared transaction. The certificate is
debited first, then the customer credited: if the second call fails, the
certificate is already debited with nothing credited yet, which is worse
for the customer than the reverse order would be, but it avoids ever
creating store credit unbacked by an actual debit (the more dangerous
direction — a missed credit can always be granted manually; an
over-granted one is a much harder conversation to have with a merchant).
If the credit grant fails, one compensating call attempts to restore the
certificate's prior balance/status; if that also fails, the returned
message states exactly what state was left so it can be reconciled by
hand. This is a real, unresolved race condition if two admins transfer the
same certificate concurrently (BigCommerce's v2 PUT has no optimistic-
concurrency precondition) — flagged here rather than fixed, since closing
it needs either an app-level lock or accepting the residual risk.

### Cross-origin control panel navigation

`components/ui/control-panel-link.tsx` navigates the BigCommerce control
panel's parent frame (not this app's own iframe) for links to native
control-panel pages this app doesn't reimplement. It can't use `next/link`
(no in-app transition is happening), so it renders a real `<a href>` (so
modifier-clicks/middle-click still work) but intercepts a plain click to
set `window.top.location` instead: an iframe can't read/write a
cross-origin parent frame's properties, but assigning `window.top.location`
for a top-level navigation is allowed regardless.

## Deployment scaffolding

Vercel- and Postgres-specific tooling (build scripts, migration runner,
`.env.vercel.example`) is opt-in via `pnpm scaffold vercel`
(`scripts/scaffold.mjs`), not baked into the base app — this starter is
meant to target any hosting provider. See `scripts/vercel/scaffold.mjs`'s
own comments for what it adds.

## Known follow-ups

- The GraphQL client's rate-limit handling (see above).
- Whether CI/deploy tooling for a non-Vercel target has
  `CREDENTIALS_STORE_DRIVER` set correctly before invoking its own build.
