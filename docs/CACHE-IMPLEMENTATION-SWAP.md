# Swapping the Caching Implementation

This app has two caching implementations. The default uses Next's Cache
Components; hosting targets that can't run it use fetch-level caching instead.
A scaffolding script converts the app from the first to the second by running
`scripts/cache-swap/swap-to-fetch-caching.mjs`.

This document explains how that conversion works and what you have to keep up
to date when you change the app's caching. For what the two implementations
*are*, see the caching section of [ARCHITECTURE.md](./ARCHITECTURE.md).

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

The mapping in `scripts/cache-swap/fetch-cache-manifest.json` expresses the entry points and cache profiles/tags.

### Nothing Cache Components-Only May Survive

After both halves run, the swap scans `searchDirs` again and fails if it finds
any API that only works under Cache Components — `"use cache"`, `cacheLife()`,
`cacheTag()`, or `updateTag()`.

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

The swap's own leftover check (above) catches unwrapped Cache Components code.
Afterwards, run `pnpm lint` and a typecheck too — between them they catch the
rest: an import left unused after a removal, or one missing after an
addition.

## Checklist: Adding Caching Without Breaking the Swap

Every cache you add has to work under both implementations, and the tooling
can only infer half of that. Work through whichever case applies.

### Caching a Component

1. Wrap the whole Cache Components block in markers — the directive,
   `cacheLife()`, and every `cacheTag()`:

   ```ts
   // @cache-components-only:start
   "use cache: remote";
   cacheLife(cacheProfile(CACHE_PROFILE_STANDARD));
   cacheTag(CUSTOMERS_LIST_TAG);
   // @cache-components-only:end
   ```

2. Wrap the imports it needs in their own marker block. Group them at the end
   of the import list so the block stays contiguous:

   ```ts
   // @cache-components-only:start
   import { cacheLife, cacheTag } from "next/cache";
   import { cacheProfile, CACHE_PROFILE_STANDARD } from "@/lib/cache/cache-profiles";
   import { CUSTOMERS_LIST_TAG } from "@/lib/gift-certs-manager/customers/cache-tags";
   // @cache-components-only:end
   ```

3. Nothing goes in the manifest. A component boundary has no fetch-level
   equivalent, so it's simply absent on a fetch-level target — correct, as long
   as the data it renders is cached at the fetch that supplies it.

### Caching a Data-Access Function

1. Mark the Cache Components block and its imports, as above.

2. Give its `apiClient.get()` call an options object if it doesn't have one,
   even when empty. The swap inserts a property; it never creates the object:

   ```ts
   const { data } = await apiClient.get<Thing>(THINGS_PATH, {
   });
   ```

3. Add a `fetchCaching` entry to
   `scripts/cache-swap/fetch-cache-manifest.json`:

   ```jsonc
   {
     "file": "src/lib/gift-certs-manager/things/things-api.ts",
     "function": "fetchThings",
     "profile": "CACHE_PROFILE_STANDARD",
     "tags": ["THINGS_LIST_TAG"]
   }
   ```

4. Make sure every identifier in `tags` will be in scope after the swap. The
   `profile` import is added for you; anything else needs
   `addImportSpecifiers`, or `declareConstants` for a tag constant that only
   the fetch implementation uses.

5. Check the function holds exactly one `apiClient.get()`. Two is ambiguous and
   the swap refuses to guess — split the function if you need both cached.

### Invalidating a New Tag

1. Wrap the `updateTag()` call in markers. It has no fetch-level counterpart:
   the swap rewrites invalidations from the manifest, not from your call.

2. If the mutation should also invalidate a list tag under fetch caching, add
   the tag function to `companionTags` in the `invalidations` entry. Keying on
   the function name rather than the full expression means it keeps working
   when the argument changes.

### Before You Commit

* Run the swap on a scratch branch and read the diff. It's the only way to see
  what the fetch-level implementation actually becomes.
* Then run `pnpm lint` and a typecheck **on the swapped tree**. An unused
  import after a removal or a missing one after an addition shows up there and
  nowhere else.
* `git checkout` to throw the swap away. It's one-directional, so never commit
  its output to a branch that also carries the Cache Components version.

The two halves fail very differently, which is worth internalizing. Forget a
marker and the leftover check fails the swap, naming the file and line.
Forget the manifest entry and nothing complains: the app builds, lint and
typecheck are clean, and the fetch is simply never cached on Cloudflare.
That's the one mistake here you have to catch by reading.

## Reference

* [ARCHITECTURE.md](./ARCHITECTURE.md) — what the two implementations are
* [CLOUDFLARE-DEPLOYMENT.md](./CLOUDFLARE-DEPLOYMENT.md) — the target that uses the swap
* [Next.js caching with Cache Components](https://nextjs.org/docs/app/getting-started/caching)
* [Next.js `fetch` caching options](https://nextjs.org/docs/app/api-reference/functions/fetch)
