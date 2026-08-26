---
name: bootstrap-app
description: Remove the starter app's Gift Certificates Manager example (gift certificates, customers, channels, mock handlers, example routes), bootstrap a single starter page for the developer's own feature, and replace the lab project's docs with app docs. Use when someone wants to start their own BigCommerce single-click app from this starter, strip out or delete the gift certificates example, or "bootstrap my app".
---

# Bootstrap Your Own App

Turns this starter into a clean base for your own app in three phases, each
ending at a recommended commit point:

1. **Remove** the Gift Certificates Manager example and rewire the keeper
   files that referenced it.
2. **Bootstrap** one starter page for your feature: a component in
   `src/components/<feature>/`, a route in `src/app/store/[storeHash]/`
   (plus its `(root)` dev alias), and the home-page pass-through in
   `src/app/store/[storeHash]/page.tsx`.
3. **Clean up docs** that describe the lab project or the example rather
   than the developer's app. This phase is guidance only, with no script.

It does **not** scaffold data access layers, Server Actions, mock handlers,
or more routes — those follow the patterns in
`docs/USING-AS-A-STARTER.md`.

`docs/USING-AS-A-STARTER.md` is the source of truth for what to keep, remove,
and update. The scripts automate its current guidance, but the starter will
change after they were written. **You** are responsible for the result:
treat script output as a first pass and verify it against the guide and the
scan.

## Scripts

All in `.agents/skills/bootstrap-app/scripts/`, run from the repo root:

| Script | Does |
| --- | --- |
| `remove.mjs --feature <name> --app-extension keep\|remove [--extra-dir <path>]...` | Copies `app-shell.tsx` and `main-nav.tsx` (and with `keep`, the app extension pieces) into `src/components/<feature>/` / `src/lib/<feature>/`, rewires their imports, deletes the example dirs plus every route section that imports them (found by import, not by name), and unwires the mock handler registry, cache-swap manifest, and (with `remove`) the extension's `/auth` call and shell banner. Swaps a placeholder into the home page so the result builds. |
| `scan.mjs` | Read-only. Lists example dirs still present, unresolvable imports, and lines that still mention the example. Re-run freely. |
| `bootstrap.mjs --feature <name> [--title "<Title>"] [--app-name "<Name>"]` | Creates the starter page from `templates/`, replaces the home-page placeholder, resets `NAV_ITEMS`, and optionally sets `package.json` `name` and root `metadata`. |

`remove.mjs` and `bootstrap.mjs` never fail on a mismatched edit. Instead
they print **MANUAL FOLLOW-UPS** — treat each one as a task for you.
Their configuration (example dirs, route roots, preserved files, scan
keywords) is at the top of `shared.mjs`.

## Steps

### 1. Preflight

* Run `git status --short`. `remove.mjs` refuses to run with uncommitted
  changes under `src/`, `scripts/`, or `package.json`, so its result is
  easy to review and revert. If there are changes, ask the user how to
  proceed (commit, stash, or pass `--force`).
* Read the "The Short Version", "What to Keep", "What to Remove", and
  "What to Update" sections of `docs/USING-AS-A-STARTER.md`. Compare them
  with the configuration in `scripts/shared.mjs`. Note anything the guide
  says to remove or update that the config doesn't cover — handle it in
  step 4, or pass extra example-only directories via `--extra-dir`.

### 2. Gather Inputs and Commit Preference

Ask in a single `AskUserQuestion` call (skip anything already answered):

* **Feature directory name**: kebab-case, e.g. `order-notes`. Used for the
  component directory, route segment, and nav item id.
* **Feature title**: shown in the nav and page header. Default: the name
  in Title Case.
* **App extension**: `remove` (recommended unless they want a
  control-panel menu item) or `keep` (preserved into the feature's dirs for
  them to re-point).
* **App name** (optional): for `package.json` and page metadata.

Also settle how commits will be handled. The recommendation is **three
commits**, one per phase, so each can be reviewed (or reverted) on its
own. Check the user's instructions first:
their `CLAUDE.md` files, memory, and the current request.

* If they've **authorized commits** for this task, commit at each commit
  point without asking again.
* If they've said to **ask before committing**, or haven't said anything,
  ask at each commit point and offer the suggested message.
* If they **decline**, don't raise it again. Mention the one-commit-per-phase
  recommendation once in the final report.

Apply the same rule to creating a branch (e.g.
`git switch -c bootstrap-<feature>`), which is worth suggesting if they're
on `main`.

### 3. Remove the Example

```shell
node .agents/skills/bootstrap-app/scripts/remove.mjs \
  --feature <name> --app-extension <keep|remove>
node .agents/skills/bootstrap-app/scripts/scan.mjs
```

### 4. Review and Finish the Removal

This is the fallback for anything the script missed or couldn't do. Work
through the manual follow-ups and the scan report, re-running `scan.mjs`
until it's clean:

* **Example directories still present** — delete them if they're
  example-only.
* **Unresolvable imports** — open the importing file:
  * If it belongs to the example (a route section, component, or helper
    that only serves gift certificates/customers/channels), delete it. If
    that leaves its directory empty, delete the directory too.
  * If it's a keeper (anything "What to Keep" lists), remove the reference
    *and* the code that depends on it, using "What to Update" as the guide.
    Never delete a keeper path.
* **Strong mentions** — in code, treat like an unresolvable import. In
  comments, reword to be generic or drop the stale cross-reference (e.g.
  "see gift-certificates-api.ts"). Edit only the comment, not the code
  around it.
* **Weak mentions** — act only when they mean the example's customers or
  channels feature. Leave generic BigCommerce wording alone (the
  `CUSTOMERS` app-extension model, customer PII notes).
* **Expected, leave for bootstrap**: `NAV_ITEMS` in
  `src/components/<feature>/main-nav.tsx`, the placeholder home page, and
  root `metadata` (if an app name was given).
* **Preserved copies** in `src/components/<feature>/` are the developer's
  now. Reword their example-specific comments (e.g. main-nav's note about
  "the gift certificates page"), but keep their code intact.

Also look past what the scan covers. Check for example-only env vars in
`.env.example`, dependencies only the example used, and anything from the
preflight comparison. If you extended the removal by hand, tell the user
which `shared.mjs` config should be updated so the next run catches it. Don't edit the skill
unprompted.

Then verify the removal builds:

```shell
pnpm exec next typegen
pnpm exec tsc --noEmit
pnpm lint
```

`next typegen` regenerates `.next/types` so deleted routes don't produce
stale type errors. Fix any errors and re-run until all three pass.

**Commit point 1.** Following the preference from step 2, commit with a
message like `Remove Gift Certificates Manager example`.

### 5. Bootstrap the Feature

```shell
node .agents/skills/bootstrap-app/scripts/bootstrap.mjs \
  --feature <name> --title "<Title>" [--app-name "<App Name>"]
node .agents/skills/bootstrap-app/scripts/scan.mjs
```

Resolve any manual follow-ups. The scan should now be clean apart from
weak mentions you've already judged generic. With `--app-extension keep`,
ask the user what the extension should open (context, model, url, label).
Update `APP_EXTENSION_INPUT` in `src/lib/<feature>/app-extension-gql.ts`
to match and remove its TODO.

Re-run the three verification commands. Optionally start the dev server
with `DATA_MODE=MOCK` on a port other than 3000. Confirm `/` and
`/<feature>` render the starter page with its nav item, then stop the
server.

**Commit point 2.** Following the same preference, commit with a message
like `Bootstrap <Title> feature`.

### 6. Clean Up Lab and Example Docs

Much of the repo's documentation describes the lab project (its tutorial,
commit history, and tags) or uses the removed example to illustrate
patterns. Clean it up so the docs describe the developer's app. Work from
what each file actually contains now, not from this list alone:

* **Delete lab-only docs.** `docs/TUTORIAL.md` is entirely about building
  the example step by step. `CHANGELOG.md` is the lab project's version
  history — replace it with a short stub (a title and an empty
  `Unreleased` section) rather than deleting it. Treat any other doc that
  exists only to teach or maintain the lab the same way.
* **Rewrite `AGENTS.md`** for the developer's app. Keep "System Setup &
  Tools" (it keeps `.claude/skills` linked to `.agents/skills`) and "Never
  Commit Local Secrets", minus its paragraph about rebuilding a
  progressive history. Remove everything about the lab: the progressive
  history and Git model, project version and changelog conventions, tag
  conventions, commit history structure, lab exercise and step tables,
  orphan-branch protected paths, and the framework install command.
  Replace the title and intro with the app name and a one-line
  description, or a placeholder for the user to fill in. Leave
  `CLAUDE.md` alone — it only imports `AGENTS.md`.
* **Rewrite `README.md`.** Remove the tutorial option and the "Gift
  Certificates Manager Example" section. Reframe the intro and the "Using
  This App" options around the developer's app. Keep generic material
  such as the Developer Portal setup and hosting provider support.
* **Adapt `docs/RUN-EXAMPLE-APP.md`** into a guide to running the
  developer's app. Rename it with `git mv` (e.g. to
  `docs/RUN-LOCALLY.md`), retitle it, and remove example-specific steps
  and wording. Keep the four-step MOCK → STATIC → MULTITENANT local →
  hosted progression.
* **Add a note to docs that use the example as illustration** (currently
  `docs/ARCHITECTURE.md`, `docs/CACHE-IMPLEMENTATION-SWAP.md`, and
  `docs/USING-AS-A-STARTER.md`; find others by searching `docs/` for
  "gift", "customer", and "channel"). Don't rewrite their content. Add a
  short note under the title saying the examples refer to the Gift
  Certificates Manager, which was removed in the commit from commit
  point 1 and can still be viewed in git history. If the user declined
  commits, describe it as "the starter's original example" instead.
  Docs with only a passing mention (the deployment and local single-click
  guides) just need that mention made generic.
* **Fix links.** Search every Markdown file outside `node_modules` and
  `.agents` for links to deleted or renamed docs, and for links to
  source paths that no longer exist. Update or remove each one — e.g.
  `USING-AS-A-STARTER.md` and the deployment guides link to the run guide
  you renamed.

Leave `.agents/skills/bootstrap-app/` in place. It refuses to run again
once the example is gone.

**Commit point 3.** Following the same preference, commit with a message
like `Replace lab project docs with app docs`. Stage the doc paths by name
(including deletions and the rename), alongside `AGENTS.md`, `README.md`,
and `CHANGELOG.md`.

### 7. Report

Summarize what was removed, preserved, created, and changed in the docs,
plus any manual removals beyond the scripts. List these follow-ups, but
don't do them unprompted:

* **Build the feature**: a data access layer in `src/lib/<feature>/`, mock
  handlers registered in `handler-registry.ts`, `<AuthorizedPage>` on every
  page, a `(root)` alias per route, and `isAuthorizedForStore` in every
  Server Action. See "Patterns to Follow" in
  `docs/USING-AS-A-STARTER.md`.
* **Cache swap**: register each new cached fetch in
  `scripts/cache-swap/fetch-cache-manifest.json`, and add any new directory
  with `@cache-components-only` markers to its `searchDirs`. See
  `docs/CACHE-IMPLEMENTATION-SWAP.md`.
* **Branding**: in `.env.local`, set `DEVELOPER_NAME`, `SUPPORT_*`, and
  `DEVELOPER_LOGO_FILENAME`. Also update `package.json` `version`.
* **Placeholders**: fill in anything left as a placeholder in
  `AGENTS.md` or `README.md`.

## Committing Safely

When a commit point is reached:

* Stage explicit paths only, never `git add -A`, `git add .`, or
  `git commit -a`. For commit points 1 and 2, stage everything the skill
  touched with `git add -- src scripts package.json` (pathspecs include
  deletions). For commit point 3, stage the doc files by name. Add any
  other file you edited by name.
* Run `git status --short` before committing. Make sure no local secret
  files are staged (`.env.local`, `.env.production.local`, `.dev.vars`,
  `.secrets.production`).
* Never push unless the user asks.
