---
name: check-hosting-tooling-impact
description: After making a code change, before committing one, or before opening or reviewing a pull request, when the change touches caching (`"use cache"`, `cacheLife`, `cacheTag`, `updateTag`, cache tags or profiles, `@cache-components-only` markers, the fetch-cache manifest, `cacheComponents` in next.config.ts), the REST or GraphQL API client's request or options handling, the cache swap script, a `scripts/<profile>/scaffold.mjs`, or the hosting profiles (adding or changing one), check whether the cache swap script or the scaffold-hosting skill's scripts need a matching update, and suggest it to the user. Use proactively; the user won't ask for it by name.
user-invocable: false
---

# Check Hosting Tooling Impact

The app's hosting tooling depends on the shape of the app's code, but
nothing ties the two together automatically. When one changes, the other
can go stale without any error until someone runs a scaffold:

* **The cache swap** (`scripts/cache-swap/swap-to-fetch-caching.mjs` and its
  manifest, `scripts/cache-swap/fetch-cache-manifest.json`) rewrites
  Cache Components code into fetch-level caching by matching text in the
  source.
* **The `scaffold-hosting` skill** (`.agents/skills/scaffold-hosting/`) checks
  a tree before and after a scaffold. Its scripts copy the swap's rules and
  each scaffold's expected results by hand, rather than importing them.

Your job here is to notice when a change crosses one of those dependencies,
work out what would need to change, and ask the user. You are only
suggesting: don't edit the tooling unless the user agrees, and never hold up
a commit or pull request they've asked for. This skill has no scripts of
its own.

## When to Run This

Run it when you've made a code change, are about to commit one, or are
about to open, update, or review a pull request, and the change does any of
the following:

* Adds, removes, moves, or restructures cached code: `"use cache"`
  directives, `cacheLife()`, `cacheTag()`, `updateTag()`, cache tag
  functions or constants, or `@cache-components-only` markers.
* Edits the cache profiles or the caching switch in
  `src/lib/cache/cache-profiles.ts`, or the `cacheComponents` setting in
  `next.config.ts`.
* Changes the REST or GraphQL API client: its method names or signatures,
  its request options (especially `cache`), how it builds a `fetch` call,
  or how callers obtain it (`getRestApiClient`, `getGraphqlApiClient`).
* Adds a new data-access function that makes a GET request, or changes an
  existing one that's listed in the fetch-cache manifest.
* Edits the swap script, its manifest, `scripts/scaffold.mjs`, or any
  `scripts/<profile>/scaffold.mjs` or its templates.
* Adds a new hosting profile, or changes what an existing one writes.

Skip it for changes that touch none of these, such as UI-only edits,
copy changes, or docs.

## How to Evaluate

Work from the actual diff, not from memory of what you meant to change:
`git diff` for uncommitted work, `git diff --staged` before a commit, and
the whole branch against its base before a pull request (e.g.
`git diff main...HEAD`, or `gh pr diff <number>` for an existing one). A
pull request can carry several commits, and the check is about their
combined effect. For each area below
that the diff touches, ask the questions listed. The source of truth for
the swap's rules is `docs/CACHE-IMPLEMENTATION-SWAP.md`. Read it if
anything here is unclear.

### Cached App Code

This is ordinary app work, and usually the fix is in the app code or the
manifest rather than in the tooling. Check it anyway, since it's the most
common way the swap breaks:

* Is every new Cache Components construct inside markers, including its
  imports?
* Is every new marked file inside one of the manifest's `searchDirs`? A new
  feature directory usually needs adding there.
* Does every cached function that makes a REST GET have a `fetchCaching`
  entry, with a matching profile and tags?
* Does each anchored function still exist under the same name, as a
  top-level `function` declaration (not an arrow function), with exactly
  one `apiClient.get<` call that has an options object?
* Does a new `updateTag(someTag(...))` need a `companionTags` entry, so list
  caches are invalidated under fetch caching too?
* Does a component boundary now render data from a new uncached GET? The
  swap removes the boundary, so that data stops being cached unless the
  GET gets a manifest entry.

If something here is missing, suggest the app-side fix. If the change is
something the swap can't express at all, such as a cached GraphQL read, two
GETs that genuinely belong in one function, or a client variable that isn't
named `apiClient`, that's a tooling gap. Treat it under the next section.

### The Swap Script and Its Manifest

The swap matches text, so a change in the app's conventions can break it.
Ask whether the change alters any of these assumptions:

* The marker comment strings, and how a region and the drop-specifier
  marker are written.
* That cached fetches go through a variable named `apiClient` calling
  `.get<`, with an options object the swap can add `cache:` to.
* That functions are found by a top-level `function` declaration.
* The import path for cache profiles (`@/lib/cache/cache-profiles`) and the
  profile constant names.
* That invalidation uses `updateTag`, and that the APIs removed and checked
  for afterwards are `"use cache"`, `cacheLife(`, and `cacheTag(`.

If one no longer holds, the swap script needs updating, along with
`docs/CACHE-IMPLEMENTATION-SWAP.md`.

### The API Client

The swap writes fetch-level caching as a `cache: { profile, tags }` option,
which the REST client turns into `fetch` options through
`toFetchCacheOptions()` in `src/lib/cache/cache-profiles.ts`. Check:

* Does the REST client still accept and forward the `cache` option the
  same way? If it was renamed, reshaped, or dropped, the swap's output no
  longer compiles or no longer caches.
* Did a method name or calling pattern change (for example `get` to
  `fetch`, or a new wrapper callers use instead of `apiClient`)? The swap
  and the skill's checks both match the old text.
* Did the GraphQL client gain caching support? The swap can't express
  GraphQL reads today, and the skill reports them as losing their caching.
  Support would need changes to the swap, its manifest format, and the
  skill.

### The scaffold-hosting Skill's Scripts

These scripts copy rules from the swap and from each scaffold by hand. Any
change to what they copy needs a matching edit:

* `scripts/analyze.mjs` copies the swap's marker parsing, function
  anchoring, `apiClient.get<` matching, the removed-API list, and the
  manifest checks. It also has its own patterns for recognizing
  hand-written fetch caching (the `cache:` option, `next.revalidate`,
  `force-cache`, `unstable_cache`), a list of directories excluded from
  that scan (`src/lib/cache`), the way it reads profile constants from
  `cache-profiles.ts`, and the way it reads a literal
  `cacheComponents: true|false` from `next.config.ts`.
* `scripts/run-cache-swap.mjs` and `scripts/rehearse.mjs` call the swap's
  exported `swapToFetchCaching()` and switch `cacheComponents: true` to
  `false` by text replacement.
* `scripts/profiles/cloudflare.mjs` and `scripts/profiles/vercel.mjs` copy
  each scaffold's scripts, dependencies, template files, and expected
  values. Any change to `scripts/<profile>/scaffold.mjs` or its templates
  probably needs a matching change here.
* `SKILL.md` describes the finding codes, profiles, and steps. Update it
  when any of the above changes what the scripts report.

### Hosting Profiles

A new or changed profile touches several places that have to agree:

* `scripts/scaffold.mjs`, where profile names are registered, and the new
  `scripts/<profile>/scaffold.mjs`.
* The skill's `scripts/profiles/manifest.json`: a new entry with the
  profile's command, whether it runs the swap and turns off
  `cacheComponents`, the tracked paths it touches, the files it creates, a
  commit message, and its deployment guide.
* A new `scripts/profiles/<profile>.mjs` if the profile needs checks beyond
  the swap, following the interface described in `scripts/profiles.mjs`.
* The deployment guide for the new host, if there isn't one yet.

## Prompting the User

If nothing needs updating, say nothing about this check, or at most one
line if you were about to commit or open a pull request.

Otherwise, before committing or opening the pull request (or right after
the code change, if neither was asked for), tell the user briefly:

1. What in the change affects the tooling, naming the file and the
   assumption it breaks.
2. What you'd update, file by file, in a sentence each.
3. What happens if they leave it, e.g. "the Cloudflare scaffold would fail
   partway through the swap" or "the preflight would stop reporting this
   case."

Then ask with `AskUserQuestion` whether to make the updates now, make them
in a separate commit, or skip them. If they're committing, offer to commit
the code as asked first, so the tooling update stays a separate change.

For a pull request, the options are to add the tooling updates to it as
their own commit before opening it, open it as-is and follow up with a
separate pull request, or skip them. If they open it without the updates,
offer to note the gap in the pull request description so reviewers see it.

When you're reviewing someone else's pull request, don't make the changes.
Raise what's affected as review findings, with the same file-by-file detail
and consequences.

When you do make tooling updates, check them the way the skill does:
run `.agents/skills/scaffold-hosting/scripts/preflight.mjs` for each
affected profile and `rehearse.mjs` if the swap or its manifest changed,
then lint the edited scripts.
