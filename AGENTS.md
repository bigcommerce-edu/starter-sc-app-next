# BigCommerce Single-Click App Starter Lab Project

A tutorial-shaped progressive history that teaches how to build a
BigCommerce single-click installable app on Next.js, using a gift
certificates manager as the worked example feature.

## Terminology and Git Model

This repository maintains two kinds of history **separately**:

- **Traditional branch** (`main`): a normal Git branch with stable,
  append-only history. Custom-code changes are made on feature branches,
  reviewed via pull request, and merged here. `main`'s history is never
  rewritten.
- **Progressive history**: a tutorial-shaped commit
  chain (clean framework install → setup/boilerplate → step commits → end
  metadata) that represents the step-by-step lab progression. It is
  rebuilt as an independent commit chain and identified by a
  **project-version tag** (plain semver) at its tip plus the step tags
  along it.

`main` and the latest progressive history have **different tip commits but
identical file trees**.
Every change must be replicated across both, using the `bcedu-lab-sync`
skill, and verified with its `validate-sync` command.

## Project Version and Changelog

- The **project version** (plain semver, separate from the Next.js
  framework version) is held in `package.json`'s `version` field and
  tagged on the tip of the corresponding progressive history.
- Each version has an entry in `CHANGELOG.md`.
- **Metadata at the end**: the project-version bump, changelog entry, and
  tutorial-doc updates are folded into the final commit(s) of each
  rebuilt progressive history (amended on each rebuild rather than
  accumulating new commits).
- The lab steps and diff links live in `docs/TUTORIAL.md`, which carries a
  "Based on version X" banner matching the latest progressive history.

## Tag Conventions

- **Project-version tag**: plain semver (e.g. `1.0.0`) at a progressive
  history's tip. Created fresh per history; never migrated.
- **Step tags**: `<prefix>-NN-pre` / `<prefix>-NN-post` for main labs
  (which keep per-step granularity), plus `<prefix>-start` /
  `<prefix>-complete` at each lab's boundary — `<prefix>-start` sits on
  the same commit as the previous lab's `<prefix>-complete`, since a main
  lab's boundary is not itself a TODO commit. Enhancements after the main
  labs instead get a single `<prefix>-pre` / `<prefix>-post` pair (no
  `-start`/`-complete`), keeping `-pre` consistently meaning "the TODO
  commit" across both main labs and enhancements. Migrated onto a new
  history by the Main Tags publish.
- **Boilerplate tags**: `<prefix>-start` / `<prefix>-complete` pairs
  marking segments of the setup/boilerplate phase that precedes `start`.
  These segments are reference-only — they contain no TODO commits, so
  there is no `-pre`/`-post` pairing, and `-start` marks the last commit
  *before* the segment rather than its first commit (so the compare link
  shows the whole segment). Unlike lab tags, boilerplate segments may
  overlap or nest: `boilerplate-start`/`boilerplate-complete` span the
  phase broadly, while `depend-*`, `root-*`, and `mock-data-*` mark
  sub-ranges within it. `boilerplate-complete` deliberately stops short
  of the compile-only stub commit, since a diff full of empty stubs is
  noise for a reader reviewing the scaffolding. Migrated onto a new
  history by the Main Tags publish.

## Commit History Structure

- The first commit is a clean Next.js install (`create-next-app`).
- **Strict 1:1 TODO → code** for main labs: each commit that introduces
  `TODO:` comments is immediately followed by the code commit that
  resolves them (one TODO commit per code commit). The one exception is a
  step that only installs dependencies: there is nothing for a learner to
  fill in, so it is a single code commit with no preceding TODO commit,
  and its `-pre` tag sits on the commit before it.
- **Enhancements** use a looser granularity: one broad TODO commit up
  front (covering every TODO the whole feature will resolve, each with
  its own independent, per-function comment) followed by one or more code
  commits, each resolving its own slice — since an enhancement gets a
  single pre/post tag pair rather than one per sub-step. Files an
  enhancement introduces are created by the enhancement's own TODO commit
  rather than pre-stubbed by the setup phase — the compile-only stub
  commit covers only files a main lab will implement.

### Boilerplate Segments

Reference-only segments of the setup/boilerplate phase preceding `start`.
`boilerplate` spans the whole phase; the others mark sub-ranges within it.

| Segment | Description | Tag Prefix |
| ------- | ----------- | ---------- |
| Dependencies | Installing the project's runtime and dev dependencies, apart from the BigDesign and styled-components packages installed in Lab 1 | `depend` |
| Root route group | The `(root)` route group and store-scoped/error routes | `root` |
| Mock data | The gift certificates data-access layer and its mock data/handlers | `mock-data` |
| Full boilerplate | The setup phase up to (but excluding) the compile-only stub commit | `boilerplate` |

### Lab Exercises

| Exercise | Description | Tag Prefix |
| ------ | ----------- | ---------- |
| Lab 1 | Adding BigDesign and basic Gift Certificates UI | `ui` |
| Lab 2 | Adding the BigCommerce REST API client | `rest-api` |
| Lab 3 | The single-click app auth workflow and key storage/lookup | `auth` |
| Lab 4 | Session tracking and authentication | `session` |
| Lab 5 | The Postgres driver | `postgres` |
| Enhancement | Uninstall and remove-user callbacks | `uninstall` |
| Enhancement | Caching and memoization with Cache Components | `caching` |
| Enhancement | Rate-limit and timeout behavior | `rate-limit` |
| Enhancement | Customers feature (list, detail, nav) | `customers` |
| Enhancement | Gift certificate list filtering, balance actions, and account decoration/transfer-to-store-credit | `gift-certs-enh` |
| Enhancement | GraphQL client and App Extension registration | `graphql-ext` |
| Enhancement | Cross-origin BigCommerce control panel links | `cp-links` |
| Enhancement | Opt-in Vercel + Postgres deployment scaffolding | `scaffold-vercel` |

### Lab Step Breakdown

Each main-lab step is a `<tag>-NN-pre` (TODO placeholders) commit
immediately followed by a `<tag>-NN-post` (implementation) commit — except
for a dependency-install step, which has no TODO commit (see the strict
1:1 rule above).

**Lab 1 — Adding BigDesign and basic Gift Certificates UI (`ui`)** —
start: `start`, complete: `ui-complete`

| Step | Tag Base | Description |
| ---- | --- | ----------- |
| 1 | `ui-01` | Install the BigDesign and styled-components packages |
| 2 | `ui-02` | Wire BigDesign into the root layout |
| 3 | `ui-03` | Convert main layout components to BigDesign |
| 4 | `ui-04` | Build the gift certificates list page |
| 5 | `ui-05` | Replace the store home page with the gift certificates list |
| 6 | `ui-06` | Build the gift certificate detail page |
| 7 | `ui-07` | Status update and balance refill actions |
| 8 | `ui-08` | Convert remaining components to BigDesign |

**Lab 2 — Adding the BigCommerce REST API client (`rest-api`)** —
start: `rest-api-start`, complete: `rest-api-complete`

| Step | Tag Base | Description |
| ---- | --- | ----------- |
| 1 | `rest-api-01` | Introduce the real REST client |
| 2 | `rest-api-02` | Fetch gift certificates through the real REST client |
| 3 | `rest-api-03` | Fetch/update a single gift certificate through the real REST client |

**Lab 3 — The single-click app auth workflow and key storage/lookup (`auth`)** — 
start: `auth-start`, complete: `auth-complete`

| Step | Tag Base | Description |
| ---- | --- | ----------- |
| 1 | `auth-01` | Build the SQLite credentials store driver |
| 2 | `auth-02` | Implement the install callback |
| 3 | `auth-03` | Implement the launch callback |

**Lab 4 — Session tracking and authentication (`session`)** —
start: `session-start`, complete: `session-complete`

| Step | Tag Base | Description |
| ---- | --- | ----------- |
| 1 | `session-01` | Implement session types and JWT signing |
| 2 | `session-02` | Implement the session cookie |
| 3 | `session-03` | Implement the secondary authorization check |
| 4 | `session-04` | Implement the primary authorization gate (`proxy.ts`) |

**Lab 5 — The Postgres driver (`postgres`)** —
start: `postgres-start`, complete: `postgres-complete`

| Step | Tag Base | Description |
| ---- | --- | ----------- |
| 1 | `postgres-01` | Build the Postgres credentials store driver |
| 2 | `postgres-02` | Build the Postgres driver loader indirection |
| 3 | `postgres-03` | Write the initial Postgres migration and runner |
| 4 | `postgres-04` | Add the POSTGRES driver-select branch |

**Enhancement — Uninstall and remove-user callbacks (`uninstall`)** —
pre: `uninstall-pre`, post: `uninstall-post`

- Implement the uninstall and remove-user callbacks

**Enhancement — Caching and memoization (`caching`)** —
pre: `caching-pre`, post: `caching-post`

- Enable Cache Components in `next.config.ts`
- Implement caching in appropriate components/actions
- Implement Suspense boundaries and fallbacks
- Memoize various lookups per-request

**Enhancement — Rate-limit and timeout behavior (`rate-limit`)** —
pre: `rate-limit-pre`, post: `rate-limit-post`

- Implement 429 retry and request timeout

**Enhancement — Customers feature (`customers`)** —
pre: `customers-pre`, post: `customers-post`

- Define customer and channel data access layer and mock data/handlers
- Build a customers list and detail page
- Add the main section nav

**Enhancement — Gift certificate list filtering, balance actions, and account decoration/transfer-to-store-credit (`gift-certs-enh`)** — 
pre: `gift-certs-enh-pre`, post: `gift-certs-enh-post`

- Add filtering logic in gift certificates list
- Add to Balance action for gift certificates
- Build GiftCertificateActionsMenu (View+Refill)
- Decorate gift certificates with registered customer accounts
- Show registered customer account info on the party panel
- Transfer gift certificate balance to store credit

**Enhancement — GraphQL client and App Extension registration(`graphql-ext`)** — 
pre: `graphql-ext-pre`, post: `graphql-ext-post`

- Build the BigCommerce Admin GraphQL API client
- Register an app extension on install and persist a record in storage
- Create a warning banner and "re-try" action in case initial installation fails

**Enhancement — Cross-origin BigCommerce control panel links (`cp-links`)** — 
pre: `cp-links-pre`, post: `cp-links-post`

- Link to native BigCommerce control panel pages

**Enhancement — Opt-in Vercel + Postgres deployment scaffolding (`scaffold-vercel`)** — 
pre: `scaffold-vercel-pre`, post: `scaffold-vercel-post`

- Add a scaffold command for opting into hosting-specific tooling
- Scaffold Vercel plus Postgres deployment tooling

## File Removal - Protected Paths

When creating a clean orphan branch, protect these additional paths from
removal:

* `.env.local`
* `data/` (the gitignored local SQLite credentials file)

## Framework Install Command and Dependencies Installation

Install the base framework with:

```
pnpm create next-app@<version>
```

Where `<version>` is the version the user specified.

After the main install command completes, run `pnpm approve-builds --all` before making the initial commit. An explicit `pnpm install` is not needed; the install command handles it.

Regarding upgrading dependencies when a framework upgrade is done: Usually all dependent packages are expected to be installed in commits prior to lab boilerplate and lab steps. This project has exceptions: The BigDesign and styled-components packages are installed in a lab step commit (in the UI lab). When dependencies are upgraded, upgrading these packages at that commit should be included.
