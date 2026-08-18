# Using This App as a Starter

This guide covers turning this repository into the foundation for your own
BigCommerce single-click app: what to keep, what to eventually delete, what
to rewire, and which patterns to follow as you build your own features.

The gift certificates manager included here is a **worked example**. It
exists to demonstrate the patterns in a real, working feature — not because
your app needs gift certificates. The auth, session, API client, credentials
storage, caching, and error-handling layers underneath it are the actual
starter, and they're feature-agnostic.

Read [ARCHITECTURE.md](./ARCHITECTURE.md) alongside this guide. It explains
*why* each layer is built the way it is; this guide is about what to do with
them.

## The Short Version

| Area | What to do |
| --- | --- |
| `src/lib/*` except `gift-certs-manager` | **Keep** |
| `src/components/*` except `gift-certs-manager` | **Keep** |
| `src/proxy.ts` | **Keep** |
| `src/app/api/app/*`, `src/app/app-error`, `src/app/unauthorized`, root error boundaries | **Keep** |
| `src/lib/gift-certs-manager`, `src/components/gift-certs-manager` | **Remove** once you no longer need the reference |
| `app/(root)/gift-certs`, `app/(root)/customers`, `app/store/[storeHash]/gift-certs`, `app/store/[storeHash]/customers` | **Remove** once you no longer need the reference |
| `app/store/[storeHash]/page.tsx`, both `layout.tsx` files, the mock handler registry, the app extension install in `/api/app/auth` | **Update** to point at your own feature |

## What to Keep

These are the starter proper. Nothing in them knows anything about gift
certificates, and you shouldn't need to modify them to build your own
feature.

### Everything in `src/lib` Except `gift-certs-manager`

* **`lib/bc-auth/`** — the install (`/auth`) and launch (`/load`) flows,
  token exchange, signed-payload verification, and the uninstall/remove-user
  logic. This is the single-click app protocol itself.
* **`lib/session/`** — session types, JWT signing, the session cookie, and
  `isAuthorizedForStore`, the authoritative per-request authorization check.
* **`lib/credentials-store/`** — the `CredentialsStore` interface plus the
  SQLite and Postgres drivers, token encryption, and driver selection.
* **`lib/bc-api-client/`** — the REST and GraphQL clients, the mock REST
  client, rate-limit and timeout handling, data-mode resolution, and
  per-store credential resolution.
* **`lib/errors/`** — `AppError`, the logger, and the JSON error helper.
* **`lib/routing/`** — `getAppUrl`/`getAbsoluteAppUrl`, control-panel URL
  building, and the root-route guard.
* **`lib/actions/`** — the `ActionResult` type every Server Action returns.

### Everything in `src/components` Except `gift-certs-manager`

* **`components/layout/`** — `AuthorizedPage`, the data-mode banner, error
  and not-found fallbacks, the unauthorized routes, the content fallback,
  and the developer info panel.
* **`components/ui/`** — the BigDesign re-export barrel and provider, the
  styled-components registry, `AppLink`, `ControlPanelLink`, action alerts,
  and the pending overlay.

`components/ui/big-design.tsx` is a deliberate re-export barrel. Importing
BigDesign through it (rather than from `@bigcommerce/big-design` directly)
keeps the `"use client"` boundary in one place — see the note in
[Gotchas](#gotchas) about passing client components as named props.

### `src/proxy.ts`

The primary authorization gate: a cheap, DB-free check of the session
cookie's signature and its `authenticatedStores` claim against the URL's
store hash, which also slides the session TTL forward on every request. It
matches every route under `app/store/[storeHash]/`, so it keeps protecting
your routes with no changes as long as you keep that segment.

### Framework and Support Routes

* `src/app/api/app/auth`, `load`, `uninstall`, `remove_user` — the four
  BigCommerce callbacks. Only `/auth` needs an edit (see
  [What to Update](#what-to-update)).
* `src/app/app-error/`, `src/app/unauthorized/` — the plain, shell-less
  pages the auth flow redirects to.
* `src/app/layout.tsx`, `global-error.tsx`, `not-found.tsx`, and the
  per-segment `error.tsx` files.

## What to Remove

Everything below is the example feature. It's useful as a reference while
you build your first feature or two, so there's no rush — but none of it
should survive into a shipped app.

* `src/app/(root)/gift-certs/` and `src/app/(root)/customers/`
* `src/app/store/[storeHash]/gift-certs/` and
  `src/app/store/[storeHash]/customers/`
* `src/components/gift-certs-manager/`
* `src/lib/gift-certs-manager/`

Removing these has a handful of knock-on effects, because a few keeper files
import from them. Work through [What to Update](#what-to-update) at the same
time.

Two files in `components/gift-certs-manager/` are worth reading before you
delete them, since they're example-flavored versions of things your app will
probably want its own copy of:

* `app-shell.tsx` — the layout chrome (banners, nav, sidebar, Suspense
  boundaries).
* `main-nav.tsx` — section navigation built on `getAppUrl`, so the same
  component works on both store-scoped and root-level dev routes.

`app-extension-status-banner/` is also example-specific, but the pattern it
demonstrates — surfacing a failed install-time side effect and offering a
retry — generalizes to anything you do during `/auth` that's allowed to fail
without blocking the install.

## What to Update

### `src/app/store/[storeHash]/page.tsx`

Today this is a one-line pass-through that makes the gift certificates list
the app's home page:

```tsx
// REPLACE this pass-through export with your own app's root page component.
export { default } from "@/app/store/[storeHash]/gift-certs/page";
```

Replace it with your own home page — either a real page component or a
pass-through to your app's primary section.

### `src/app/(root)/layout.tsx` and `src/app/store/[storeHash]/layout.tsx`

Both import `AppShell` from `components/gift-certs-manager/`. Point them at
your own shell component instead (and move it out of the feature directory —
`components/layout/` is the natural home).

Keep the shape of each layout as-is:

* `app/store/[storeHash]/layout.tsx` renders the shell around `children`,
  synchronously, so the chrome paints while each page's own Suspense
  boundary resolves its auth check and data.
* `app/(root)/layout.tsx` wraps the same shell in `renderRootRoute()`, which
  is what stops the root-level dev routes from serving real content in
  `MULTITENANT` mode.

### `src/app/api/app/auth/route.ts`

The install callback calls `registerAppExtension` from
`lib/gift-certs-manager/`. If you want an app extension (a menu item inside
the BigCommerce control panel), move that logic into your own lib directory
and update the import. If you don't, delete the call and the
`/api/internal/app-extension-status` route along with it.

The rest of the route — the code exchange, the error-reason redirects, the
final redirect into `/store/<storeHash>/` — is feature-agnostic and should
stay.

### `src/lib/bc-api-client/rest-client/mock-rest-client/handler-registry.ts`

The one place feature mock handlers are wired into the mock REST client.
Remove the three `gift-certs-manager` imports and array entries, and add your
own. `MockRestApiClient` itself never needs to change.

### Branding and Metadata

* `.env.local` — `DEVELOPER_NAME`, `SUPPORT_EMAIL`, `SUPPORT_URL`,
  `SUPPORT_PHONE`, `DEVELOPER_LOGO_FILENAME` (the file itself lives in
  `public/`).
* `package.json` — `name` and `version`.
* `src/app/layout.tsx` — the exported `metadata`.
* This repository's own docs (`README.md`, `docs/TUTORIAL.md`,
  `CHANGELOG.md`, `AGENTS.md`) describe the lab project, not your app.

## Patterns to Follow

These are the app-specific conventions worth carrying into your own
features. General Next.js practice isn't covered here.

### Pass-Through Routes in `app/(root)`

Every real page lives under `app/store/[storeHash]/`. The routes under
`app/(root)/` are thin aliases that re-export the store-scoped page, so the
same component can be developed without a store context in `MOCK`/`STATIC`
mode:

```tsx
import GiftCertsPage from "@/app/store/[storeHash]/gift-certs/page";

// This route exists only for MOCK/STATIC development, when there's no store hash
// context in the page request.
export default function Page(props: React.ComponentProps<typeof GiftCertsPage>) {
  return <GiftCertsPage {...props} />;
}
```

Mirror each of your own sections this way and you get local development with
no tunnel, no install, and no database. `renderRootRoute()` in
`app/(root)/layout.tsx` guarantees these can't serve real content in
production.

### Wrapping Every Page in `<AuthorizedPage>`

Every page under `app/store/[storeHash]/` passes its own component to
`AuthorizedPage` rather than rendering it directly:

```tsx
export default function Page(props: PageProps) {
  return (
    <Suspense fallback={<ContentFallback />}>
      <AuthorizedPage {...props} pageComponent={MyFeaturePage} />
    </Suspense>
  );
}
```

The page component is passed as a **component reference**, not pre-rendered
JSX, so it only renders after the authorization check passes.

This check belongs on each page, not in a shared layout, because a layout's
render is skippable by Next's client Router Cache on a same-layout
navigation. And because a Server Action is directly POST-able, **every Server
Action must call `isAuthorizedForStore` itself too** — neither a layout's nor
a page's check extends to it. Passing `proxy.ts` is necessary but never
sufficient.

### A Data Access Layer in `lib`

Give each feature its own directory under `src/lib/<feature>/`, organized by
domain concept rather than file type. The gift certificates example uses:

* `types.ts` — the domain types plus the BigCommerce API paths.
* `<concept>-api.ts` — the cached fetch functions and mutations.
* `cache-tags.ts` — the tag constants and per-record tag builders.
* `query.ts` — parsing/validating list query params.
* `mock/` — mock data and route handlers (see below).

Data-fetching functions get the API client from `getRestApiClient(storeHash)`
(or `getGraphqlApiClient`) and take the `storeHash` route param through as an
argument. Never resolve credentials yourself: the client factory decides
which store to actually target and returns the mock client in `MOCK` mode, so
one call site works in all three data modes.

For cached reads, the convention is:

```ts
async function fetchThings(query: ThingsQuery, storeHash: string | undefined) {
  "use cache: remote";
  cacheLife("standard");
  cacheTag(THINGS_LIST_TAG);

  const apiClient = await getRestApiClient(storeHash);
  // ...fetch, then tag each returned record's own id
}
```

Tag with both a shared list tag and a per-record tag (added after the fetch
resolves, once ids are known), and call `updateTag` from your mutations so a
write is visible immediately instead of waiting out the `cacheLife`. Two
`cacheLife` profiles are configured in `next.config.ts`: `standard` (5 min)
and `extended` (10 min, for slower-changing data).

Data-access functions that might not find a record should return `undefined`
or throw rather than calling `notFound()` themselves — the same function gets
called from Server Actions, where a 404 navigation would be wrong. Let the
page decide.

Server Actions return `ActionResult` (`{ success, message }`) for every
expected failure rather than throwing, since Next strips a thrown Server
Action error's message to a generic digest in production.

### Mock Data Handlers and the Registry

`MOCK` mode is what makes step 1 of the
[four-step strategy](#the-four-step-development-strategy) possible, and it's
worth keeping for your own features.

Each feature contributes handlers that intercept requests by method and path
and answer them from in-memory data:

1. Put mock records in `lib/<feature>/mock/mock-<things>.ts`.
2. Write one handler per endpoint (list, detail, update) in
   `lib/<feature>/mock/<thing>-<kind>-handler.ts`, honoring the same query
   params, pagination, and response quirks as the real endpoint.
3. Collect them in `lib/<feature>/mock/handlers.ts`.
4. Add that array to `mockRouteHandlers` in the mock client's
   `handler-registry.ts`.

Handlers that mirror the real API's oddities (v2 returning `204` instead of
`200 []` for an empty list, decimal amounts arriving as strings) are what
make `MOCK`-mode development actually predictive of real behavior.
`MOCK_REQUEST_DELAY_MIN_MS`/`MAX_MS` simulate latency so your loading and
Suspense states are visible.

### Credentials Store Drivers and Hosting Scaffolding

These two extension points are how you target infrastructure this starter
doesn't ship support for.

#### Adding a Credentials Store Driver

To support a different database (D1, MySQL, DynamoDB, a managed secrets
service):

1. **Implement `CredentialsStore`** from
   `lib/credentials-store/types.ts` in a new
   `lib/credentials-store/<name>-driver/` directory. The interface covers
   stores, users, store-user links, and store-extension links.
2. **Match the existing drivers' semantics**, not just their signatures:
   * `setStore`/`setUser`/`setStoreUser`/`setStoreExtension` are **upserts**.
     `/auth` re-running for an already-installed store must replace its
     token, not error or duplicate.
   * `deleteStore` and `deleteUser` run in a **single transaction** and both
     clean up users left with no remaining stores.
   * `isStoreUserLinked` stays a **separate query** from `getStoreToken`, so
     each has a cache key matching what it's actually keyed on. They run
     concurrently in `isAuthorizedForStore`.
   * Every method wraps its query so driver errors become a sanitized
     `AppError("DATABASE", ...)` — a raw driver error can embed connection
     details.
   * Tokens are encrypted at rest via `lib/credentials-store/encryption.ts`.
3. **Register it** in `get-credentials-store.ts`: add the name to
   `CredentialsStoreDriver`, `VALID_DRIVERS`, and the `switch`.
4. **Keep incompatible native dependencies out of other builds.** If your
   driver pulls in a package that can't bundle everywhere, copy the Postgres
   driver's indirection: import through a `<name>-driver-loader.ts`, add a
   `<name>-driver-loader.unavailable.ts` stub, and alias between them in
   `next.config.ts`'s `turbopack.resolveAlias` based on
   `CREDENTIALS_STORE_DRIVER`. A runtime env check is not enough — a bundler
   traces every statically reachable module regardless.
5. **Document its env vars** in `.env.example`, in their own
   `# ===== <NAME> SETTINGS =====` section.

#### Adding a Hosting Scaffold

Deployment tooling is opt-in via `pnpm scaffold <profile>` so the base app
stays provider-neutral — the app itself has no idea which profile (if any)
has been scaffolded.

To add one:

1. Create `scripts/<profile>/scaffold.mjs` exporting
   `scaffold(): Promise<void>`.
2. Add the profile name to `PROFILES` in `scripts/scaffold.mjs`.
3. Have it add what that host needs: `package.json` scripts (e.g. a build
   command that runs migrations first), any provider config files, and a
   generated `.env.<profile>.example`.

Follow the Vercel profile's two conventions:

* **Be idempotent.** Only add what's missing; never overwrite a script or
  file a developer may have customized, so it's safe to re-run after pulling
  upstream changes.
* **Generate the env reference from `.env.example`** rather than a
  hand-maintained copy, honoring the `# DEV ONLY START`/`# DEV ONLY END`
  markers so local-only variables are stripped from a production profile.

If your host's build runs migrations, keep that script keyed on its own
connection-string variables rather than on `DATA_MODE` or
`CREDENTIALS_STORE_DRIVER` — that way it no-ops harmlessly for anyone using
a different driver instead of failing their build.

## The Four-Step Development Strategy

As you build your own features, the four-step progression in
[Run the Example App](./RUN-EXAMPLE-APP.md) is the recommended path. It's worth
following per feature, not just once for the project — each step adds exactly
one category of failure, so when something breaks you know which layer it's
in.

1. **`MOCK` locally** — build the UI and the data-access layer's shape
   against mock handlers. No credentials, no network, no database, no
   install. Failures here are your own code.
2. **`STATIC` locally** — point it at one real store with a static API
   token. This is where real API response shapes, pagination quirks, error
   codes, and rate limits show up. Failures here are integration issues.
3. **`MULTITENANT` locally** — install into a store through a tunnel, with
   SQLite storage. This is where the install flow, session cookie,
   authorization gates, and iframe/cross-origin behavior get exercised. See
   [Running Locally as a Single-Click App](./LOCAL-SINGLE-CLICK-APP.md).
4. **`MULTITENANT` deployed** — a real host and a shared database. This is
   where multi-instance concerns, build-time configuration, and
   deployment-protection quirks surface. See
   [Deploying to Vercel](./VERCEL-DEPLOYMENT.md).

Skipping straight to step 4 with a new feature means debugging a UI bug, a
malformed API request, a session problem, and a build configuration issue all
at once, through a control-panel iframe.

## Getting Rid of Data Modes

Three data modes are a development affordance, not a requirement. If you
don't need them, here's the minimal way to cut them — the goal is removing
the *surface area*, not purging every conditional from the codebase.

### Dropping MOCK and STATIC

If your app will only ever run as a real multitenant single-click app:

1. **Delete `src/app/(root)/`** entirely — the whole route group exists only
   for store-hash-less development. That also removes the need for
   `lib/routing/root-route-guard.tsx` and
   `components/layout/unauthorized-root-route.tsx`.
2. **Hard-code `getDataMode`** in `lib/bc-api-client/data-mode.ts`:

   ```ts
   export function getDataMode(): DataMode {
     return "MULTITENANT";
   }
   ```

   Keep the function and its return type. Every consumer
   (`proxy.ts`, `resolve-store-credentials.ts`, `get-rest-api-client.ts`,
   `is-authorized-for-store.ts`, `data-mode-banner.tsx`) keeps compiling,
   their non-multitenant branches simply become unreachable, and you haven't
   had to touch a single call site. Prune those dead branches later if you
   want, at your own pace.
3. **Remove the now-unused env vars** from `.env.example`: `DATA_MODE`,
   `STATIC_STORE_HASH`, `STATIC_STORE_TOKEN`, and the
   `MOCK_REQUEST_DELAY_*` pair.

## Gotchas

* **Don't pass a Client Component as a named prop** (as opposed to
  `children`) into a BigDesign component from a Server Component. It can
  produce hydration mismatches. Pass it as `children`, or make the parent a
  Client Component.
* **`APP_ORIGIN` is the only source of truth** for the app's public origin.
  Never derive it from the incoming request — behind a proxy the observed
  host and scheme aren't guaranteed to match what BigCommerce actually
  called.
* **The session cookie needs HTTPS.** It's `SameSite=None; Secure;
  Partitioned` because the control panel renders the app cross-origin in an
  iframe. Plain `http://localhost` won't work for a real install.
* **Route Handlers that must not be browser-cached** need an explicit
  `Cache-Control: no-store`. A GET Route Handler's response is otherwise
  eligible for normal HTTP caching, which `cacheTag`/`updateTag` can't
  invalidate.
* **An API client instance must not cross a `use cache` boundary.** Pass the
  plain, serializable `storeHash` in and call `getRestApiClient` inside the
  cached function.

## Learning the Patterns Hands-On

If you'd rather build these layers yourself than read them, this repository
doubles as a step-by-step tutorial: start from boilerplate and implement the
UI, REST client, auth flow, session handling, and Postgres driver in order,
with a diff for each step. See [TUTORIAL.md](./TUTORIAL.md).
