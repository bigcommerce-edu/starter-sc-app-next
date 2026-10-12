---
name: scaffold-data-access
description: Scaffold a data access layer in src/lib/<feature>/ for BigCommerce API resources (types, cache tags, query parsing, cached reads, uncached reads, mutations, and optional mock handlers), or add endpoints/operations to an existing one. Use when someone wants to fetch or update BigCommerce data in their app, add a data access layer, add an API call/endpoint/operation to a feature, or add mock data for a resource.
---

# Scaffold a Data Access Layer

Creates or extends `src/lib/<feature>/`, the layer between pages/Server
Actions and the BigCommerce API client in `src/lib/bc-api-client/`. It
covers the data layer only: no pages, components, or Server Actions (the
report tells the user how to call it from those).

The templates in `templates/` capture the conventions of the starter's
original Gift Certificates Manager example, which may already be removed.
They're reference patterns to adapt, not files to copy verbatim. Each one
names its target path on its first line. In them, `Thing`/`Things`,
`thing`/`things`, `THINGS`, and `<feature>` stand for the concept's
PascalCase, kebab/camel, and constant names and the feature directory.

## Core Patterns (Non-Negotiable)

* **Always go through the API client.** Every request uses
  `getRestApiClient(storeHash)` (or `getGraphqlApiClient(storeHash)` for
  GraphQL Admin API operations) inside the function that makes it. Never
  resolve tokens, build URLs, or choose a mock/real client in this layer —
  the factory picks the right store and the mock client by data mode.
* **`storeHash: string | undefined` on every data-access function**, as its
  last parameter, passed straight through from the `[storeHash]` route
  param. `undefined` is valid (root-level MOCK/STATIC dev routes).
* **An API client instance never crosses a `use cache` boundary.** Pass
  the plain `storeHash` in and call `getRestApiClient` inside the cached
  function.
* **One directory per domain concept**, each with separate files per
  concern:

  | File | Holds |
  | --- | --- |
  | `types.ts` | API path constants and path builders, domain types (BigCommerce field names), query and result types |
  | `cache-tags.ts` | A per-record tag builder and a shared list tag |
  | `query.ts` | Parsing/validating list URL search params and building them back (list operations only) |
  | `<things>-api.ts` | Wire types, the parse function, cached reads, uncached reads, mutations |
  | `decorate-with-<others>.ts` | Cross-concept joins (only when needed) |
  | `mock/` | Optional mock data and handlers |

  Types shared by several concepts in a feature go in
  `src/lib/<feature>/types.ts`.
* **Wire vs. domain types.** `<Thing>WireRecord` is the record exactly as
  sent; `Thing` is the normalized shape. One `parse<Thing>` function
  converts between them, and every read maps through it (e.g. decimal
  strings → numbers, `null` arrays → `[]`).
* **Reads don't decide what "missing" means.** No `notFound()` in this
  layer — the same function serves pages and Server Actions. A
  single-resource 404 surfaces as an `UPSTREAM_API` `AppError` with
  `status: 404`. A list-path lookup returns `undefined`. Callers use
  `isNotFoundError()` / an `undefined` check.
* **Server Actions read uncached.** Every read a mutation depends on gets
  an `...Uncached` counterpart passing `cache: { profile:
  CACHE_PROFILE_NONE }`.
* **Mutations are named business operations** (e.g. `renameThing`,
  `archiveThing`) over a shared private update function. They're never
  cached and never handle authorization or invalidation — Server Actions
  do (`isAuthorizedForStore`, `ActionResult`, `updateTag`).
* **Caching stays swappable.** Wrap every Cache Components construct
  (`"use cache: remote"`, `cacheLife`, `cacheTag`, and their imports) in
  `// @cache-components-only:start` / `:end` markers. Use
  `:drop-specifier <name>` for an import that's only partly Cache
  Components-specific — e.g. `cacheProfile`, or a tag builder used only
  inside markers. Anything left unused after the swap is a lint failure on
  the fetch-level target. Give each cached function exactly one
  `apiClient.get` with an options object. See
  `docs/CACHE-IMPLEMENTATION-SWAP.md`.

## Steps

### 1. Determine the Mode

List `src/lib/` and `src/components/`.

* **New layer**: `src/lib/<feature>/` doesn't exist yet, or has no data
  layer.
* **Extend**: the feature directory already has concept directories. Read
  the existing concept's `types.ts`, `cache-tags.ts`, and `<things>-api.ts`
  (and `mock/` if present) before writing anything. **Match the existing
  code's conventions where they differ from the templates.** Reuse its
  shared types, and add to its files rather than creating parallel ones.

If the request names a concept that already exists, it's an extension of
that concept. A new concept in an existing feature gets its own directory
alongside the others.

### 2. Gather Inputs

Infer what you can from the request and the codebase. Then ask the
remaining questions in a single `AskUserQuestion` call:

* **Feature directory**: default to the single existing
  `src/components/<feature>/` or `src/lib/<feature>/` directory if there's
  exactly one.
* **Concept(s) and operations**: e.g. "products: list with name filter,
  detail, update price". Default for a new concept: list + detail.
* **Endpoint(s)**: if the user didn't name them, identify the BigCommerce
  REST endpoints yourself. Use the BigCommerce docs search tool if one is
  available, otherwise ask. Confirm the version (v2/v3), path,
  single-resource path (or lack of one), filter/sort/pagination params,
  response shape, and the required OAuth scope.
* **Mock handlers: always ask explicitly**, even when everything else is
  known: "Wire up mock handlers so these reads work in MOCK mode?" Never
  assume either answer.

Also settle the commit preference before writing anything, following
"Gather Inputs and Commit Preference" in
`.agents/skills/bootstrap-app/SKILL.md`. Check the user's instructions
first; commit if authorized, otherwise ask at the commit point.

### 3. Write the Layer

For each concept, using the templates as the pattern:

1. **`types.ts`**: path constants from the endpoint reference, the domain
   type with the BigCommerce field names this app needs, and a
   query/result type per list operation. v3 lists carry `totalItems`; v2
   lists carry `hasNextPage`.
2. **`cache-tags.ts`**: tag prefixes unique across the whole app.
3. **`query.ts`**: only for list operations driven by URL search params.
   Allow-list every enumerated param and validate every number.
4. **`<things>-api.ts`**: use `things-api.v3.ts.template` or
   `things-api.v2.ts.template` to match the endpoint. Response handling to
   get right:
   * v3 lists: a `V3ListResponse<T>` envelope with `meta.pagination.total`.
     v3 single records: a `{ data: T }` envelope.
   * v2 lists: a bare array, `undefined` on a 204 empty result (default to
     `[]`), and no total (peek ahead for `hasNextPage`). v2 single records:
     the bare record.
   * Request params: send a filter only when it has a value. Map UI sort
     columns to real API fields in one `SORT_FIELD` record, and use the
     endpoint's own operator syntax (`name:like`, `id:in`,
     `date_created:min`).
   * Mutation bodies: wire-format field names and values. Respect
     full-replacement PUTs (send the required fields from the current
     record) and bulk/array PUTs where the endpoint uses them.
   * Use `CACHE_PROFILE_EXTENDED` instead of `STANDARD` for data that
     rarely changes (e.g. channels, settings).
   * Cache a read **either** in this layer (as the template does) **or** in
     the component that renders it, not both. If the user's components
     already cache it, leave the data-access function uncached.
5. **Decorators**: only when a concept needs another concept's records
   joined in. Follow `decorate-with-others.ts.template`.

When extending, add new functions next to related ones. Add any new tags
to `cache-tags.ts` and any new paths to `types.ts`.

### 4. Mock Handlers (Only If the User Said Yes)

Follow `templates/mock/`. Per concept:

* **`mock/mock-<things>.ts`**: records in **wire** format. If the user
  didn't specify the data, decide it yourself, without asking:
  * Use about 12–15 records, enough to exceed one page at the default list
    `limit` so pagination is exercised. Use fewer only for small, fixed
    sets (e.g. 2–4 channels).
  * Cover every enum/status value at least once, plus edge cases: empty
    optional fields, zero amounts, long names, and boundary dates.
  * Use realistic but clearly fake values: `example.com` emails, plausible
    names, and sequential ids starting at 1. Keep them deterministic (no
    random values or `Date.now()`).
  * Reproduce wire quirks: decimal strings, `null` arrays, and timestamp
    formats exactly as the real endpoint sends them.
  * When records reference another concept (e.g. `channel_id`), make the
    ids match that concept's mock records.
* **`mock/<things>-list-handler.ts`**: honor every param the API function
  sends (filters, sort field *and* direction, page, limit, `id:in` if used)
  and return the real response shape.
* **`mock/<thing>-detail-handler.ts`**: only for single-resource paths.
  Missing ids throw the same 404 `AppError` shape as the real client.
* **`mock/handlers.ts`**: exports `<things>MockHandlers`, most specific
  pattern first.
* **Register** it in
  `src/lib/bc-api-client/rest-client/mock-rest-client/handler-registry.ts`:
  one import plus `...<things>MockHandlers` in `mockRouteHandlers`. Order
  matters there too, since the first matching pattern wins.

Mocks cover GET only — `MockRestApiClient` rejects mutations. If the user
said no, tell them that MOCK mode will throw `MockRestApiClient has no
handler for path "..."` for these reads, and that STATIC or MULTITENANT
mode is needed to exercise them.

### 5. Register Cached Fetches for the Cache Swap

For every data-access function with a Cache Components block, add a
`fetchCaching` entry to `scripts/cache-swap/fetch-cache-manifest.json`
(`file`, `function`, `profile`, `tags`, plus `addImportSpecifiers` for any
tag identifier the file doesn't already import). Make sure
`src/lib/<feature>` is in `searchDirs`. Field reference: "The Manifest" in
`docs/CACHE-IMPLEMENTATION-SWAP.md`. If the manifest or doc doesn't exist,
skip this step and say so.

### 6. Verify

```shell
pnpm exec tsc --noEmit
pnpm lint
```

Fix any errors and re-run until both pass. If you edited the manifest,
offer to test the swap in a throwaway `git worktree`. The swap module only
exports a function, so running the file directly does nothing. Call it
from the worktree root:

```shell
node --input-type=module -e 'const m = await import("./scripts/cache-swap/swap-to-fetch-caching.mjs"); m.swapToFetchCaching();'
```

Confirm it logs a `Cached <function>` line for each new manifest entry.
Then run `tsc` and `pnpm lint` there, and remove the worktree. Never run
the swap in the user's working tree.

**Commit point.** Following the preference from step 2, commit with a
message like `Add <things> data access layer` (or `Add <operation> to
<things> data access layer`). Follow "Committing Safely" in
`.agents/skills/bootstrap-app/SKILL.md`: stage explicit paths
(`src/lib/<feature>`, `handler-registry.ts`, the manifest), never
`git add -A`, and never push unless asked.

### 7. Report

List the functions created or added (with signatures), the files touched,
any required OAuth scopes the app's Developer Portal settings need, and
whether mocks were wired. Then add a short usage note:

* **Pages**: resolve `storeHash` from `params` and call the read. Translate
  a missing record to `notFound()` there — `isNotFoundError(error)` for a
  thrown 404, or an `undefined` result for a list-path lookup. Wrap each
  page in `<AuthorizedPage>`.
* **Server Actions**: call `isAuthorizedForStore(storeHash)` first. Read
  with the `...Uncached` function, mutate, then `updateTag()` the
  per-record tag (and the list tag). Return `ActionResult` with
  `toSafeMessage(error, "...")` instead of throwing.

Pointers: "Patterns to Follow" in `docs/USING-AS-A-STARTER.md`, if it
still exists.
