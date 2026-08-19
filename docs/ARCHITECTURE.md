# Architecture

This is a starter Next.js app for building a BigCommerce single-click
installable app. The included feature (a gift certificates manager) is a
worked example — expect to remove `src/components/gift-certs-manager`,
`src/lib/gift-certs-manager`, and their routes when building a real app on
top of this starter, while keeping the auth/session/API-client/credentials
layers described below.

## Data modes

`DATA_MODE` (env var) selects one of three modes everywhere data is fetched. The concept of "data mode" is core to the app's aim of a rapid path to development, supporting a working UI without bringing in the single-click app requirements until you're ready.

- **MOCK** (default) — no real API calls; in-memory mock data; no
  authentication. Routes render under `app/(root)/*` (no store context).
- **STATIC** — real BigCommerce API calls, but against one store/token pair
  read from env vars (`STATIC_STORE_HASH`/`STATIC_STORE_TOKEN`). Also renders
  under `app/(root)/*`.
- **MULTITENANT** — the real production mode. Every request is scoped to a
  store via the `app/store/[storeHash]` route segment, authenticated through
  the full install/session flow described below.

Only "MULTITENANT" is intended for production, and a warning banner in the app will alert you to the dev-only nature of the other modes.

## The `app/(root)` routes

`app/(root)/*` exists only so MOCK and STATIC development can render the app
without a store hash in the URL. Neither mode has (or needs) store context —
MOCK talks to no real store at all, and STATIC always targets the one store
configured via `STATIC_STORE_HASH`/`STATIC_STORE_TOKEN` — so requiring a
`/store/<hash>/` prefix during early development would mean inventing a
meaningless hash for every URL.

These routes are pass-throughs, not a second implementation: each
`app/(root)/foo/page.tsx` re-exports the corresponding
`app/store/[storeHash]/foo/page.tsx` as its own default export, so both URLs
render exactly the same component tree from one source of truth. The real
route is the `[storeHash]` one; the root copy just forwards its props.

Because they're a development convenience, they must not serve real content
in production. `app/(root)/layout.tsx` runs every root route through
`renderRootRoute` (`lib/routing/root-route-guard.tsx`), which renders
`UnauthorizedRootRoute` instead of `children` when `DATA_MODE` is
`MULTITENANT` — in that mode, a request landing on a root-level URL means
the store segment is missing from the URL, not that the page should render
unscoped.

## Route conventions

Routes in the example app follow a standard convention in their component structure:

### A corresponding pass-through in `app/(root)`

Any route added under `app/store/[storeHash]/` gets a matching
`app/(root)/` route that re-exports it (see above), so the page is reachable
in MOCK/STATIC development. Skipping it means the page only works in
MULTITENANT mode.

### Authorization via `<AuthorizedPage>`

Every page under `app/store/[storeHash]/` renders its content through
`AuthorizedPage` (`components/layout/authorized-page.tsx`) rather than
calling `isAuthorizedForStore` inline. The feature's own page component is
passed as the `pageComponent` prop — a component *reference*, not
pre-rendered JSX — so it only renders after the check passes. That works
because every link in the chain is a Server Component, so a function value
never has to cross a Server-to-Client boundary.

This check lives per-page rather than in `[storeHash]/layout.tsx` because a
layout's render is skippable by Next's client Router Cache on a same-layout
navigation (see the two-tier authorization section above).

### Suspense boundaries

Each segment that does asynchronous work wraps the next one in
`<Suspense fallback={<ContentFallback />}>`, so the shell above it can paint
immediately:

- `page.tsx` wraps `AuthorizedPage`, since the authorization check awaits
  the session cookie and a credentials-store lookup.
- The page component wraps the view component, since the view fetches data.

### Three segmented components

A route is split into three pieces, each with one responsibility:

1. **The route component** (`app/.../page.tsx`) — no data fetching and no
   dynamic values. It only composes the Suspense boundary and
   `AuthorizedPage`, forwarding `params`/`searchParams` along unresolved
   (as promises). Keeping it free of dynamic data is what lets it render
   synchronously.
2. **The page component**
   (e.g. `components/gift-certs-manager/gift-certificates/detail/gift-certificate-detail-page.tsx`)
   — awaits and normalizes the dynamic inputs: `params`, `searchParams`,
   route ids, the store hash. It resolves those into plain, serializable
   values and passes them down.
3. **The view component**
   (e.g. `gift-certificate-view.tsx`) — does the data fetching and renders
   the result. Because everything it receives is a plain serializable value,
   it can be a `"use cache: remote"` boundary with its own `cacheLife` and
   `cacheTag` (see the caching section below).

That split exists for the sake of the third piece. A `use cache` boundary
can't receive a promise or a non-serializable value, and it can't read
request-time data like cookies or params — so resolving those has to happen
strictly *above* the cacheable component. The page component is where that
resolution happens, which is what leaves the view component cacheable.

## Component library: BigDesign

The UI is built with
[BigDesign](https://developer.bigcommerce.com/big-design), BigCommerce's
React design system, so an app rendered inside the control panel iframe
matches the surrounding native UI. Component docs and a live playground are
at [developer.bigcommerce.com/big-design](https://developer.bigcommerce.com/big-design);
the source is at
[bigcommerce/big-design](https://github.com/bigcommerce/big-design).

BigDesign is `styled-components` based, so it needs two things wired up in
`app/layout.tsx`:

- **`StyledComponentsRegistry`** (`components/ui/styled-components-registry.tsx`)
  — collects styled-components' server-rendered styles so they're emitted
  with the SSR payload instead of flashing unstyled.
- **`BigDesignProvider`** (`components/ui/big-design-provider.tsx`) — the
  styled-components `ThemeProvider` with BigDesign's theme, plus
  `GlobalStyles`.

Components are imported from local re-export barrels
(`components/ui/big-design.tsx` and `components/ui/big-design-icons.tsx`)
rather than from `@bigcommerce/big-design` directly. BigDesign components
are Client Components, and the barrels carry the `"use client"` directive so
Server Components can import them without each file declaring the boundary
itself.

One hazard worth knowing: passing a Client Component into a BigDesign
component as a *named prop* (rather than as `children`) from a Server
Component can produce hydration mismatches. Prefer `children` where the API
allows it.

Note that BigDesign does not officially support React 19, which this app
requires — see
[BigDesign and React 19](../README.md#bigdesign-and-react-19) in the README
for the peer dependency override and Modal patch that work around it.

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
authenticatedStores: string[], issuedAt }` — a list, not a single store, so
one admin can be launched into multiple stores concurrently.

A stateless JWT can't be revoked before it expires, which is why the TTL is
kept short and why authorization is checked in two places (below) rather
than trusted from the cookie alone. `proxy.ts` slides that short TTL forward
on every request (see below), which would otherwise let a continuously
active session extend itself indefinitely — `issuedAt` (the original login
time, unchanged by any later refresh) lets `verifySession` enforce a hard
`SESSION_MAX_AGE_SECONDS` ceiling independent of activity, so a session
still forces re-authentication through `/load` at least once per that
window no matter how continuously it's used.

### Control panel synchronization

The app runs in an iframe inside the BigCommerce control panel, so changes to
the control panel's own state are invisible to it by default. BigCommerce
publishes a JS SDK (`https://cdn.bigcommerce.com/jssdk/bc-sdk.js`) whose
purpose is to keep an app "synchronized with the control panel": it opens a
`postMessage` channel to the parent frame, and including it on a page is the
documented way to subscribe to the events sent over that channel.

`components/layout/bigcommerce-control-panel-sync.tsx` is the single place
that loads and initializes the SDK, so it's where any further control panel
synchronization belongs as it's adopted. It's a Client Component that loads
the script (`afterInteractive`, so a cross-origin script whose only job is a
background subscription can't block the shell's first paint) and registers
`window.bcAsyncInit` to call `Bigcommerce.init()` with whichever callbacks
the app opts into. These signals only exist in the browser, which is why this
is the one place the architecture needs a client-side event handler bridging
a browser event back to the server.

It's mounted in `app/store/[storeHash]/layout.tsx` rather than the root
layout, so it only runs for the store-scoped routes actually launched inside
the control panel. Note that a layout's render being skippable by the client
Router Cache (the reason authorization can't live in a layout) is not a
problem here: this is a subscription on a mounted Client Component, so it
stays alive across exactly those client-side navigations rather than needing
to re-run per page.

#### Logout (`onLogout`)

The one event the app currently subscribes to, and the one [BigCommerce's
best-practice
guidance](https://docs.bigcommerce.com/developer/docs/integrations/apps/guide/following-best-practices#manage-user-session-timeouts)
calls out. The control panel can log the admin out at any time — including
from a different tab, which this app's iframe would otherwise never hear
about — leaving this app holding a session that outlives the one that
authorized it.

The callback invokes the `logoutFromControlPanel` Server Action in
`lib/session/logout.ts`, which deletes the session cookie via
`clearSession`. That action takes no arguments and validates nothing, because
it only ever clears the caller's own cookie — there's no store hash or user
id to trust, and the worst a forged POST achieves is logging that same caller
out. It swallows its own errors: there's no UI to report a failure to, and
the session TTL remains the backstop.

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
   That refresh preserves the original `issuedAt`, so `SESSION_MAX_AGE_SECONDS`
   (see above) still bounds the total session lifetime regardless of activity.
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

`isStoreUserLinked` is the authoritative half of `isAuthorizedForStore`'s
check (see above) — the session cookie's claim is optimistic; this confirms
the link still actually exists. It's a separate query from `getStoreToken`
(not one join) so each keeps a cache key matching what it's actually keyed
on — this by `(storeHash, userId)`, the token by `storeHash` alone — and the
two run concurrently via `Promise.all` in `isAuthorizedForStore`.

## Config-based loading

Both the REST API client and the credentials store are chosen at runtime
from an env var, behind a `get*` function that is the only supported way to
obtain one. Nothing else in the app constructs either directly, so no
calling code knows or cares which implementation it has.

The pattern is the same in both cases:

1. **One interface, several implementations.** `BcRestApiClient`
   (`rest-client/types.ts`) is implemented by `RestApiClient` and
   `MockRestApiClient`; `CredentialsStore` (`credentials-store/types.ts`) is
   implemented by `SqliteCredentialsStore` and `PostgresCredentialsStore`.
2. **One accessor function that reads config and selects.**
   `getRestApiClient(storeHash)` branches on `DATA_MODE`;
   `getCredentialsStore()` branches on `CREDENTIALS_STORE_DRIVER`, falling
   back to a default (`SQLITE`) when the var is unset or unrecognized rather
   than throwing.
3. **Memoized per request with React's `cache()`.** Every call within one
   request shares an instance — which for `SqliteCredentialsStore` also
   means sharing one open DB connection. The `cache()` key matters:
   `getRestApiClient` keys on the *resolved* store hash, not the raw route
   param, since STATIC mode resolves every route to the same store and
   should share one client for the request.

Two wrinkles worth noting:

- **Resolution is separate from selection.** `resolve-store-credentials.ts`
  answers "which store, and with what token" — not always the raw
  `[storeHash]` route param, since STATIC always targets its one
  env-configured store and MOCK has no store at all. `resolveApiToken` is
  itself a `cache()` entry keyed on store hash, which is how
  `isAuthorizedForStore` reuses the same token lookup instead of making a
  second DB round-trip.
- **The Postgres driver is loaded through an extra indirection.**
  `get-credentials-store.ts` imports `PostgresCredentialsStore` from
  `postgres-driver-loader.ts`, never from the driver directly. That file
  exists purely to be a stable specifier for `next.config.ts`'s
  `turbopack.resolveAlias` to redirect: when the driver isn't Postgres, the
  alias swaps it for `postgres-driver-loader.unavailable.ts`, keeping `pg`
  out of a build that would never select that branch. Runtime config
  selects the branch; build-time config decides whether its dependency is
  even compiled in. See the credentials storage section below.

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
- **Rate limiting**: `lib/bc-api-client/rate-limit.ts` wraps every request
  (both clients) in a reactive, single-retry handler — reads BigCommerce's
  `X-Rate-Limit-Time-Reset-Ms` REST response header only on an actual `429`,
  waits that long, and retries exactly once; a second `429` (or a `429`
  with no usable `Time-Reset-Ms`) is returned to the caller as-is rather
  than retried again. `Requests-Left`/`Requests-Quota`/`Time-Window-Ms`
  play no role in the retry decision but are still logged alongside it for
  diagnostic context. Applied uniformly to reads and mutations, since a
  `429` means BigCommerce rejected the request before doing any work —
  unlike a timed-out/aborted request, there's no ambiguity about whether a
  mutation already took effect, so retrying is a clean do-over rather than a
  risk of double-applying a write. These headers aren't documented for the
  GraphQL Admin API, but since the retry only reads them on a `429` (never
  on an ordinary response), that's a safe bet either way.
- **Errors**: both clients throw `AppError` (`lib/errors/app-error.ts`) with
  a safe, user-facing message; raw response detail goes into `cause` for
  logs only.

### The mock REST client

In MOCK mode, `getRestApiClient` returns `MockRestApiClient`
(`rest-client/mock-rest-client/`) instead of the real one. It implements the
same `BcRestApiClient` interface, so nothing above it — data access
functions, views, actions — knows which client it got.

It dispatches the way a real API does: by path. Each mock endpoint is a
`MockRouteHandler` (`mock-rest-client/types.ts`) — a `pattern` regex matched
against the request path, plus a `handle(match, params)` that returns
`{ data, headers }`. Path segments like a record id come out of the regex's
capture groups, and query params arrive as `params`, so a handler can
implement filtering and pagination the way the real endpoint does. The
optional `headers` exists for handlers mimicking a v2 endpoint's
header-based pagination; v3-shaped handlers report pagination in the body
and omit it.

Two deliberate behaviors:

- **Simulated latency** — `MOCK_REQUEST_DELAY_MIN_MS`/`MOCK_REQUEST_DELAY_MAX_MS`
  add a random delay per request, so Suspense fallbacks and loading states
  are actually visible during development. Unset or invalid values mean no
  delay, which is the right default for tests and CI.
- **Reads only** — `post`/`put`/`delete` throw. Mock mode is for building
  and demoing UI, not for round-tripping writes against in-memory data.

An unmatched path throws rather than returning an empty result, so a missing
handler surfaces as an obvious error instead of a silently empty page.

### Registered mock handlers

`MockRestApiClient` never names a feature. Handlers are registered
externally, in one place: `mock-rest-client/handler-registry.ts`, which
concatenates each feature's handler array into the `mockRouteHandlers` list
the client iterates.

Each feature owns its own handlers and its own mock data, and exposes them
as a single array — for example
`lib/gift-certs-manager/gift-certificates/mock/`, whose `handlers.ts`
exports `giftCertificatesMockHandlers`, built from the individual list and
detail handlers alongside the `mock-gift-certificates.ts` fixtures.

That indirection is what makes the demo feature disposable. Dropping gift
certificates from mock mode means deleting one import and one array entry
from `handler-registry.ts`; adding a feature's mocks means adding one of
each. `MockRestApiClient` itself never changes either way.

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

> [!WARNING]
> Caching is an core architectural pattern to understand.
> However, it might
> not be a desirable trade-off in an admin-targeted app
> where data should always be up-to-date. Evaluate your
> own app's use case.
>
> In the Gift Certificates Manager example, cached data
> will be appropriately invalidated based on the app's own actions
> (such as refilling a gift certificate), but stale data will persist
> for the cache lifetime when external updates occur (such as 
> new gift certificates being purchased).)
>
> When your own apps utilize caching, use [webhooks](https://docs.bigcommerce.com/developer/docs/integrations/webhooks/overview) to invalidate cached data wherever possible.

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

## The Gift Certificates Manager example

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
