# Swapping the Caching Implementation

This app has two caching implementations. The default uses Next's Cache
Components; hosting targets that can't run it use fetch-level caching instead.
A scaffolding script converts the app from the first to the second by running
`scripts/cache-swap/swap-to-fetch-caching.mjs`.

This document explains how that conversion works and what you have to keep up
to date when you change the app's caching. For what the two implementations
*are*, see the caching section of [ARCHITECTURE.md](./ARCHITECTURE.md).

## Why There Are Two

Cache Components (`cacheComponents: true`) is the implementation this app
demonstrates: `use cache` boundaries in components and data-access functions,
each selecting a lifetime profile with `cacheLife()` and tagging itself with
`cacheTag()`.

That doesn't work on Cloudflare Workers. Cache Components implies Partial
Prerendering, and the PPR staged-render path corrupts streamed HTML when the
app is adapted by `@opennextjs/cloudflare` — chunks of the RSC flight payload
are emitted outside their `<script>` wrapper and render as raw JSON. So the
Cloudflare target turns the flag off and caches at the `fetch()` level instead,
passing a profile and tags to the REST client rather than wrapping components.

The caching *strategy* is the same either way: the same two lifetime profiles
from `lib/cache/cache-profiles.ts`, and the same cache tags.

## How the Swap Works

The conversion has two halves that work in opposite directions, and they are
deliberately driven by different mechanisms.

### Removals Are Driven by Markers

Every construct that exists only under Cache Components is wrapped in a marker
comment pair:

```ts
// @cache-components-only:start
"use cache: remote";
cacheLife(cacheProfile(CACHE_PROFILE_STANDARD));
cacheTag(CUSTOMERS_LIST_TAG);
// @cache-components-only:end
```

The swap deletes those regions wholesale. Nothing about them is registered
anywhere else, so you can add, move, or restructure Cache Components code
freely — as long as it stays inside markers, the swap keeps working.

A third marker handles the one case where an import is only *partly*
Cache Components-specific:

```ts
// @cache-components-only:drop-specifier cacheProfile
import { cacheProfile, CACHE_PROFILE_EXTENDED } from "@/lib/cache/cache-profiles";
```

That drops the named specifier from the import on the following line and keeps
the rest. It's needed where the profile constant is used by *both*
implementations but the `cacheProfile()` accessor is not.

### Additions Are Driven by a Manifest

The other half can't work that way. A fetch needs to know its lifetime profile
and its cache tags, and that information isn't recoverable from the Cache
Components source, because the two implementations attach it in different
places:

* A `use cache` boundary in `customer-list-view.tsx` tags itself with
  `CUSTOMERS_LIST_TAG`.
* Fetch-level caching attaches that same tag to the `apiClient.get()` call
  inside `fetchCustomers`, in a different file entirely.

Only two of the six cacheable fetches in this app have their tags declared in
the same function that issues them. For the rest, the mapping is real
knowledge that has to be written down, which is what
`scripts/cache-swap/fetch-cache-manifest.json` is for.

## The Manifest

### `searchDirs`

The directories the removal pass scans for markers. Every `.ts`/`.tsx` file
under them is checked.

### `fetchCaching`

One entry per cacheable fetch. Each names the function that issues it, the
lifetime profile, and the tags:

```jsonc
{
  "file": "src/lib/gift-certs-manager/customers/customers-api.ts",
  "function": "fetchCustomer",
  "profile": "CACHE_PROFILE_STANDARD",
  "tags": ["customerTag(id)"]
}
```

| Field | Meaning |
| ----- | ------- |
| `file` | Path to the module containing the fetch. |
| `function` | The top-level function that issues the fetch. Used as the anchor — see below. |
| `profile` | A profile constant exported by `lib/cache/cache-profiles.ts`. Imported automatically. |
| `tags` | Tag expressions, written exactly as they should appear in the generated code. Anything they reference must be in scope, via `addImportSpecifiers` if needed. |
| `declareConstants` | Optional. Tag constants that only the fetch implementation needs, declared above the function. |
| `addImportSpecifiers` | Optional. Specifiers to add to an existing import, or a new import line if there isn't one. |

Entries are anchored on `(file, function)` rather than a line number or the
text of the call. That matters here: three of this app's cacheable fetches are
textually identical `apiClient.get<V3ListResponse<CustomerWireRecord>>(CUSTOMERS_PATH, {`
calls, distinguishable only by the function containing them.

The anchored function must contain **exactly one** `apiClient.get` call. Two
would be ambiguous, and the swap fails rather than guessing which one to cache.

### `invalidations`

Cache Components invalidates with `updateTag()`; fetch caching uses
`revalidateTag()` with an explicit profile. This section rewrites those calls
and adds the list-tag invalidations that only fetch caching needs:

```jsonc
{
  "rewriteCalls": { "from": "updateTag", "to": "revalidateTag", "extraArgs": ["\"max\""] },
  "companionTags": {
    "giftCertificateTag": "GIFT_CERTIFICATES_LIST_TAG",
    "customerTag": "CUSTOMERS_LIST_TAG"
  }
}
```

`companionTags` keys on the *tag function name*, so it survives changes to the
argument expression. Every `revalidateTag(giftCertificateTag(anything))` gets a
`revalidateTag(GIFT_CERTIFICATES_LIST_TAG)` after it.

Those companions exist because a `use cache` boundary can tag itself with
per-record ids *after* its fetch resolves, but a fetch tag has to be known
*before* the request is issued. So under fetch caching a listing carries only
the shared tag, and every mutation has to revalidate it.

## Changing the App's Caching

### Adding a `use cache` Boundary

Wrap the directive, `cacheLife()`, and `cacheTag()` calls in
`@cache-components-only` markers. Nothing else to do — the swap will remove
them. The component simply won't be cached on a fetch-level target, which is
the correct outcome if the data it renders isn't fetched through the REST
client.

### Making a New Fetch Cacheable

Two steps, because the two implementations need different things:

1. Add the `use cache` block to the data-access function, inside markers.
2. Add a `fetchCaching` entry naming that function, its profile, and its tags.

Skipping the second step means the fetch is cached under Cache Components but
not on fetch-level targets. That's a silent difference, so it's worth checking
the manifest whenever you add a cache tag.

### Renaming a Cached Function

Update the `function` field in the manifest. The swap fails loudly if you
don't:

```
[cache-swap] src/lib/.../channels-api.ts has no top-level function named
"fetchChannels". Update scripts/cache-swap/fetch-cache-manifest.json if it was
renamed or removed.
```

That's deliberate. An unmatched manifest entry is always an error and never a
skip, so drift surfaces immediately instead of quietly leaving a fetch
uncached.

### Keeping the Options Object

Every cacheable `apiClient.get()` call is written with an options object, even
when it has no other properties:

```ts
const { data: body } = await apiClient.get<V3ListResponse<Channel>>(CHANNELS_PATH, {
});
```

That empty object looks redundant, and it is — under Cache Components. It's
there so the swap only ever has to *insert a property* into an existing object,
never synthesize the object and rewrite the call. Don't collapse it to
`get(CHANNELS_PATH)`; the swap will fail with a message telling you to put it
back.

## Running the Swap

Normally a hosting profile's scaffold runs it (see
[CLOUDFLARE-DEPLOYMENT.md](./CLOUDFLARE-DEPLOYMENT.md)). To run it alone:

```shell
node --input-type=module -e "import { swapToFetchCaching } from './scripts/cache-swap/swap-to-fetch-caching.mjs'; swapToFetchCaching();"
```

It's idempotent: a second run finds no markers, reports that the app is already
swapped, and changes nothing.

Two things it does **not** do:

* Set `cacheComponents: false` in `next.config.ts`. That belongs to the
  hosting profile, since it's the flag that makes the swap necessary.
* Convert back. The swap is one-directional — the Cache Components
  implementation is the source of truth, and reversing it would mean
  regenerating the markers and boundaries the manifest can't describe. Use
  version control to go back.

Afterwards, run `pnpm lint` and a typecheck. Between them they catch the
realistic failure modes: an import left unused after a removal, or one missing
after an addition.

## Reference

* [ARCHITECTURE.md](./ARCHITECTURE.md) — what the two implementations are
* [CLOUDFLARE-DEPLOYMENT.md](./CLOUDFLARE-DEPLOYMENT.md) — the target that uses the swap
* [Next.js caching with Cache Components](https://nextjs.org/docs/app/getting-started/caching)
* [Next.js `fetch` caching options](https://nextjs.org/docs/app/api-reference/functions/fetch)
