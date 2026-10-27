---
name: scaffold-hosting
description: Scaffold or add appropriate tooling for a hosting provider. Run `pnpm scaffold vercel` or `pnpm scaffold cloudflare` (or only the Cache Components → fetch-level cache swap), after a read-only preflight that detects custom caching the swap can't handle, an already-swapped or half-swapped tree, and mixed caching; then verify the result and walk through next steps. Use when someone wants to deploy to Vercel or Cloudflare Workers, scaffold hosting tooling, prepare the codebase for deployment to a hosting target, run the cache swap, switch to fetch-level caching, or asks why the Cloudflare scaffold or cache swap failed.
---

# Scaffold Hosting

Runs a hosting scaffold for one of three profiles, with checks before and after:

| Profile | Runs | Touches source? |
| --- | --- | --- |
| `cloudflare` | `pnpm scaffold cloudflare` | Yes: the cache swap, `cacheComponents: false`, `proxy.ts` → `middleware.ts`, the D1 loader |
| `vercel` | `pnpm scaffold vercel` | No: `package.json` scripts and `.env.vercel.example` only |
| `cache-swap` | Only the cache swap, optionally with `cacheComponents: false` | Yes |

The Cloudflare scaffold and the standalone swap carry the risk. The swap
(`scripts/cache-swap/swap-to-fetch-caching.mjs`) rewrites files **before** it
validates them. A stale manifest entry, or Cache Components code left outside
markers, makes it throw with the tree half-swapped. Custom caching that's
outside the manifest's reach gets through without an error and quietly stops
being cached. The preflight exists to catch both before anything is written.

Read `docs/CACHE-IMPLEMENTATION-SWAP.md` before remediating anything. It is
the source of truth for markers and the manifest. The scripts here mirror its
rules, and **you** are responsible for the result: treat script output as a
first pass.

## Scripts

All in `.agents/skills/scaffold-hosting/scripts/`, run from the repo root.
Only `run-cache-swap.mjs` writes to the developer's tree.

| Script | Does |
| --- | --- |
| `preflight.mjs --profile <p> [--json]` | Read-only. Reports the working tree, the caching state, hand-written fetch caching, swap-blocking findings (codes U1–U6, below), and how far a previous scaffold got. Ends in a verdict: `READY`, `NEEDS-INPUT`, or `BLOCKED`. |
| `rehearse.mjs [--keep]` | Runs the swap plus `cacheComponents: false` in a temporary git worktree. The worktree includes the developer's uncommitted changes; ignored files such as secrets are never copied. Then runs `next typegen`, `tsc --noEmit`, and `eslint` there. Prints the swap log and diff stat, saves the full patch, and removes the worktree. Exit 1 on any failure. |
| `run-cache-swap.mjs [--disable-cache-components]` | The `cache-swap` profile: runs the swap, optionally sets `cacheComponents: false` too. |
| `verify.mjs --profile <p>` | Read-only post-run checks, as PASS/WARN/FAIL lines. Exit 1 on any FAIL. |

`analyze.mjs` is their shared, read-only analysis of the cache swap.
Everything provider-specific lives under `scripts/profiles/`:

* `manifest.json` registers each profile: the command it runs, whether it
  swaps the cache, the tracked `paths` it touches, the untracked files it
  `creates`, a commit message, and the deployment guide that follows it.
* `cloudflare.mjs` and `vercel.mjs` hold each scaffold's expectations (the
  scripts, dependencies, and files it adds) and its preflight and verify
  checks. `profiles.mjs` documents the interface.

The expectations mirror `scripts/<profile>/scaffold.mjs`. If the two
disagree, the scaffold is right: report the mismatch to the user and don't
edit the skill unprompted.

### Finding Codes

| Code | Meaning | Severity |
| --- | --- | --- |
| U1 | `"use cache"`, `cacheLife()`, or `cacheTag()` outside markers. Inside `searchDirs` (comments included) the swap throws after rewriting files; outside, the swap never sees it. | swap-fails / survives-swap |
| U2 | Marker regions in a file outside `searchDirs`. The swap won't remove them. | survives-swap |
| U3 | A `use cache` function that fetches but that the manifest doesn't (or can't) cover: no entry, more than one `apiClient.get`, a REST client not named `apiClient`, a GraphQL request, or an arrow-function scope. | caching-lost (arrow scope: possible) |
| U4 | A component-style boundary whose tags appear nowhere in the manifest, or one with only computed tags and no fetch of its own. | possible / info |
| U5 | The manifest no longer matches the source: missing file or function, ≠1 GET, no options object, a different `cache:` option already present (the swap silently skips it), an unknown profile, a missing `searchDirs` entry, or a marker mistake. | swap-fails |
| U6 | `updateTag(xTag(...))` with no `companionTags` entry, so listings including that record aren't invalidated under fetch caching. | possible |

Every severity except `info` counts as unswappable and makes the verdict
`BLOCKED` for `cloudflare` and `cache-swap`.

## Steps

### 1. Choose the Profile and Commit Handling

Skip anything the user already answered. Otherwise ask in a single
`AskUserQuestion` call:

* **Profile**: one of the names in `scripts/profiles/manifest.json` (currently `cloudflare`, `vercel`, or `cache-swap`).
* For `cache-swap` only, **also set `cacheComponents: false`**. Recommend
  yes: without it, Cache Components stays on with no boundaries to use.

Then settle commits the way `bootstrap-app` does. Check the user's
`CLAUDE.md` files, memory, and the current request:

* If they've **authorized commits** for this task, commit at each commit
  point without asking again.
* If they've said to **ask first**, or said nothing, ask at each commit point
  and offer the suggested message.
* If they **decline**, don't raise it again.

If they're on `main`, suggest a branch (e.g. `git switch -c scaffold-<profile>`)
under the same rule.

### 2. Preflight

```shell
node .agents/skills/scaffold-hosting/scripts/preflight.mjs --profile <profile>
```

This is the only detection to do before reporting. **Don't** open the
flagged files, trace imports, or work out fixes yet. That's step 4, and it
waits for the user's permission.

### 3. Report and Decide

Summarize the preflight for the user in plain language. Group findings by
severity and keep the `file:line` locations. Then handle each condition
below that applies. If several apply, settle them in this order, collecting
the questions into one `AskUserQuestion` call where you can.

#### Working Tree

* **Uncommitted changes** under `src/`, `scripts/`, `package.json`, or
  `next.config.ts`: the clean tree *is* the rollback for a failed swap. Ask
  whether to commit, stash, or stop. Proceed dirty only if the user insists,
  and tell them that a failure then can't be cleanly undone.
* **Not a git repository**: say there's no rollback. Recommend `git init` and
  a commit first.

#### Verdict `BLOCKED` (Custom Caching the Swap Can't Handle)

Report what was found and what each severity means for them:

* **swap-fails**: the scaffold would stop partway with files already
  rewritten.
* **survives-swap**: the build breaks afterwards.
* **caching-lost**: these reads silently stop being cached.
* **possible**: these need a closer look.

Then ask:

* **Analyze and fix first (Recommended)**: go to step 4.
* **Scaffold anyway**: only offer this when there are no `swap-fails`
  findings. Spell out what will be lost or broken before they confirm.
* **Stop**.

#### Caching State

| State | Meaning | Recommend |
| --- | --- | --- |
| `pristine` | Cache Components, not yet swapped | Proceed |
| `swapped` | Already fully swapped (by a previous scaffold or by hand) | The scaffold is idempotent: a re-run only fills the gaps the preflight lists. For `cache-swap`, there's nothing to do. |
| `partial` | Signals disagree (the reasons are listed) | If the changes are **uncommitted**, this is almost always an interrupted run: recommend restoring (see [Rolling Back](#rolling-back)) and starting over. If the partial state is **committed** (e.g. an earlier `cache-swap` left `cacheComponents` on), re-running is safe: every pass is idempotent. Run `rehearse.mjs` first to confirm. |
| `manual-swap` | `cacheComponents` is off and no Cache Components code remains, but some manifest fetches lack cache options (listed) | Someone swapped by hand. Re-running the swap adds the missing options, because that pass doesn't depend on markers. Rehearse first, then proceed. |
| `unknown` | `next.config.ts` has no literal `cacheComponents: true/false` | Ask the user how caching is configured. Don't run the swap until that's settled. |

#### Mixed Caching

The preflight lists hand-written fetch-level caching: `cache:` options on
REST calls, `next.revalidate`, `force-cache`, or `unstable_cache`.

* **Under Cache Components** (`cacheComponents: true`): these cache a second
  time, underneath whatever `use cache` boundary is around them. The REST
  client's own types say the two are mutually exclusive. They do survive the
  swap unchanged, so they'll work on a fetch-level target. Ask whether to
  convert them to the Cache Components pattern (markers plus a manifest
  entry) as part of step 4, or leave them.
* **After a swap**: these are fine. Mention that they're outside the manifest,
  and make sure every tag they use is invalidated somewhere.

#### Profile-Specific

* **`cloudflare`, D1 loader customized**: the scaffold *overwrites*
  `src/lib/credentials-store/d1-driver-loader.ts`. Show the user its diff
  against the template. Ask whether to back it up, merge by hand afterwards,
  or stop.
* **`cloudflare`, existing example files that differ from their templates**:
  the scaffold leaves them as they are. Mention it. Offer to regenerate any of
  them by deleting it before the run, with confirmation.
* **`vercel` on a non-pristine tree**: fetch-level caching works on Vercel.
  But the swap is one-directional, so getting Cache Components back means
  going through git. Mention any earlier Cloudflare scaffold
  (`middleware.ts`, the D1 loader) too.
* **`vercel`, stale `.env.vercel.example`** (missing keys are listed): the
  scaffold never regenerates it. Offer to delete it and re-run, with
  confirmation.

`info` findings (e.g. a boundary that only caches a storage read) just need a
one-line mention: that read will be uncached on a fetch-level target.

### 4. Remediate (Only With Permission)

Now do the detailed analysis. For each finding, read the flagged code and
whatever it calls. Then propose concrete edits, following the checklist in
`docs/CACHE-IMPLEMENTATION-SWAP.md`:

| Code | Typical fix |
| --- | --- |
| U1 (in `searchDirs`) | Wrap the directive, `cacheLife()`, `cacheTag()`, and the imports only they use in `@cache-components-only` markers. Use a `drop-specifier` marker for an import shared with fetch-level code. |
| U1 / U2 (outside) | Add the directory to the manifest's `searchDirs`, then mark anything still unmarked. |
| U3, no entry | Add a `fetchCaching` entry with the profile and tags matching the boundary's `cacheLife` and `cacheTag`. Give the `apiClient.get` call an options object. Make sure each tag is in scope via `addImportSpecifiers` or `declareConstants`. |
| U3, several GETs | Split the function so each cached GET has its own top-level function. |
| U3, client not named `apiClient` | Rename the variable. The swap matches `apiClient.get<` literally. |
| U3, GraphQL | The manifest can't express it. Tell the user it will be uncached on a fetch-level target, and ask whether that's acceptable. Don't invent manifest features or edit the swap script. |
| U3, arrow function | Convert it to a `function` declaration so the manifest can anchor on it. |
| U4, unmapped tags | Find the fetch that supplies the boundary's data. Check it has a `fetchCaching` entry, and that the tags a mutation invalidates reach it under fetch caching. |
| U5 | Update the manifest to match the source (renamed function or file, removed entry), or fix the marker. |
| U6 | Add the tag builder to an `invalidations` entry's `companionTags`, mapped to the list tag, or add an `invalidations` entry for that file. |

Present the edits as a summary (manifest diff plus a list of source changes)
before applying them. Then, after applying:

1. Re-run `preflight.mjs` until it reports no unswappable findings.
2. Check that the **unswapped** tree still builds:
   `pnpm exec next typegen && pnpm exec tsc --noEmit && pnpm lint`.
3. Rehearse the swap: `node .agents/skills/scaffold-hosting/scripts/rehearse.mjs`.
   It must pass. Read the saved patch and confirm every fix produced the
   fetch-level code you expected.

**Commit point 1** (recommended, so the scaffold's own diff stays separate):
`Prepare custom caching for the fetch-level cache swap`.

### 5. Run

For a profile with `swapsCache: true` in the manifest, rehearse first unless
the preflight verdict was `READY` with no findings at all:

```shell
node .agents/skills/scaffold-hosting/scripts/rehearse.mjs
```

Then run **only** the chosen profile's `command` from
`scripts/profiles/manifest.json`. Run exactly one command, never one per
profile. For example, for `cloudflare`:

```shell
pnpm scaffold cloudflare
```

For `cache-swap`, append `--disable-cache-components` to its command if the
user asked for `cacheComponents: false` in step 1.

Capture the output. Every `WARNING:` line, and every "already exists —
leaving it as-is" line for a file this run was expected to write, is a
follow-up to report.

#### Rolling Back

If the command throws, the tree is probably half-swapped:

1. Run `git status --short` and show the user what was written.
2. Explain the error. Usually it's a finding the preflight missed, and the
   error message names it.
3. Ask before restoring. Restore only the profile's `paths` from
   `scripts/profiles/manifest.json`, e.g. for `cloudflare`:

   ```shell
   git restore -- src scripts package.json next.config.ts
   ```

   Then delete only the untracked files in the profile's `creates`, after
   confirming them by name. Never use `git clean`, and never touch `.env.local`,
   `.env.production.local`, `.dev.vars`, `.secrets.production`, `wrangler.jsonc`,
   or `data/`.
4. Return to step 3 with what the error revealed.

### 6. Verify

```shell
node .agents/skills/scaffold-hosting/scripts/verify.mjs --profile <profile>
```

Fix or report every FAIL. Then:

* **`cloudflare`**: ask before running `pnpm install`, since it changes the
  lockfile and needs the network. Then run
  `pnpm exec next typegen && pnpm exec tsc --noEmit && pnpm lint`. tsc and
  lint are the checks. Don't run `next build` or the OpenNext build unless
  the user asks: they need `wrangler.jsonc` and real resources.
* **`cache-swap`**: `pnpm exec next typegen && pnpm exec tsc --noEmit && pnpm lint`.
* **`vercel`**: no source changed, so no typecheck is needed. Show the
  overridden keys in `.env.vercel.example` (`DATA_MODE`,
  `CREDENTIALS_STORE_DRIVER`, `DATABASE_URL`, `DATABASE_URL_UNPOOLED`).

For the swapping profiles, read `git diff -- src next.config.ts` and summarize
it: which boundaries were removed, and which fetches gained which profile and
tags.

### 7. Report and Next Steps

Summarize:

* what ran
* what changed
* verification results
* every WARN and follow-up
* anything from steps 3–4 the user chose to accept (e.g. GraphQL reads that
  are now uncached)

Then ask what's next in one `AskUserQuestion`, offering what applies:

* **Commit** (commit point 2, following the step 1 preference), with the
  profile's `commitMessage` from the manifest.
* **Cloudflare**: work through `docs/CLOUDFLARE-DEPLOYMENT.md` from
  "Create `wrangler.jsonc`" onward:
  * resources
  * `wrangler.jsonc` and the `{{CREDENTIALS_DB_NAME}}` script placeholder
  * var files
  * `pnpm cf-typegen`
  * MOCK deploy, then MULTITENANT

  Every `wrangler` command that creates resources, sets secrets, or deploys
  acts on the user's Cloudflare account. Confirm each one first. If they
  aren't logged in, suggest they run `! pnpm wrangler login` themselves.
* **Vercel**: work through `docs/VERCEL-DEPLOYMENT.md`: env vars in the
  dashboard, the Postgres integration, and deployment protection for
  branches BigCommerce has to reach.
* **`cache-swap`**: going forward, cache new reads with the REST client's
  `cache:` option directly. The markers and manifest only matter on a tree
  that still has Cache Components.

## Committing Safely

* Stage explicit paths only, never `git add -A`, `git add .`, or
  `git commit -a`. For the scaffold commit, stage the profile's `paths` and
  `creates` from the manifest, plus `pnpm-lock.yaml` if dependencies were
  installed.
* Run `git status --short` before committing. Make sure none of
  `.env.local`, `.env.production.local`, `.dev.vars`, `.secrets.production`,
  or `wrangler.jsonc` is staged. `wrangler.jsonc` holds account-specific ids;
  commit it only if the user explicitly wants to.
* Never push unless the user asks.
