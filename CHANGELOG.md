# Changelog

## 1.0.3

_Based on Next.js 16.2.9_

### Summary

UAT fixes folded into the existing lab structure. Adds control panel logout
synchronization, distinguishes a deleted record from a generic failure in the
gift certificate Server Actions, makes caching switchable by environment
variable, and unifies the balance-action gating the list and detail pages had
drifted apart on. No lab steps were added, renumbered, or removed, so the step
tags are unchanged from `1.0.2`.

### Changes

- Added `components/layout/bigcommerce-control-panel-sync.tsx`, which loads
  BigCommerce's JS SDK and subscribes to its `onLogout` event, plus the
  `logoutFromControlPanel` Server Action and the `clearSession` cookie helper
  it calls. Mounted from the store layout so it only runs on store-scoped
  routes. The component, the action, the layout mount, and the
  `session-cookie.ts` stubs are all boilerplate; `clearSession` is implemented
  alongside the rest of the cookie behavior in the session cookie step.
- Added `isNotFoundError` to `lib/errors/app-error.ts`, recognizing both a
  404 from a v2 single-resource endpoint and an explicit `NOT_FOUND` raised
  by a v3 list-style lookup. Each gift certificate Server Action now reports
  a missing record distinctly, folded into the step that introduces it.
- Made caching opt-in via `CACHE_COMPONENTS_ENABLED`. `cacheComponents` stays
  `true` so the `use cache` directives still compile; the switch instead swaps
  both `cacheLife` profiles for a zero-second one. Folded into the caching
  enhancement, with the variable added to `.env.example` in the same commit.
- Extracted `canRefill`, `canAddToBalance`, and `canTransferToStoreCredit`
  into `gift-certificates/status.ts` so the list actions menu and the Balance
  tab share one definition of when each action is offered — they previously
  disagreed about Refill. All three ship with the gift certificates
  data-access layer; `canTransferToStoreCredit` is widened to require a
  registered customer account once the enhancement introduces the
  account-bearing certificate type.
- Dismissing a confirmation modal (Cancel, Esc, or the close button) now
  abandons the pending edit rather than just hiding the dialog, on both the
  Details and Balance tabs. Each tab's resets land in the step that
  introduces the corresponding action.
- Fixed the main nav to highlight Gift Certificates on the index route, and
  to keep a consistent weight and alignment across items.
- Treated a cleared date filter in `CustomerFilters` as no filter rather than
  an invalid date.
- Switched `ControlPanelLink`'s trailing icon from `OpenInNewIcon` to
  `LogoutIcon`, signalling that the link leaves the app.
- Added `public/northlight-logo-350x130.svg`, the aspect ratio the
  BigCommerce Dev Portal expects for an app listing logo.
- Documented control panel synchronization and the caching switch in
  `docs/ARCHITECTURE.md`, and noted the caching variable in
  `docs/TUTORIAL.md`.
- Tightened the refill validation: a refill must now raise the balance, so a
  new balance at or below the current one is rejected server-side rather than
  silently applied as a debit. The Balance tab says the amount must exceed the
  current balance and keeps the Refill button disabled until it does, and the
  Add to Balance and Transfer to Store Credit buttons are likewise disabled
  until an amount is entered.

### Lab step corrections

Fixes to existing steps that were teaching less than they appeared to. None
of these change the finished app — the final tree is unchanged.

- Made the `postgres-driver-loader.ts` stub genuinely compile-only. It
  previously shipped its finished one-line re-export in the stub commit, so
  the Postgres driver loader step had nothing left to write; that step now
  adds the export itself.
- Removed two stale `TODO:` comments in `data-mode-banner.tsx` and
  `developer-info-panel.tsx` that asked the learner to switch to the
  BigDesign barrel imports those files already used.
- Reworded the `globals.css` token header to describe the tokens as
  temporary stand-ins for the BigDesign theme, rather than a permanent port —
  the file is deleted two commits later when BigDesign is wired in.
- Made the gift certificate Server Actions refresh the UI from the step that
  first writes them, using `revalidatePath` on the list and detail routes.
  Previously a status update or refill returned success without the page
  reflecting it until the caching enhancement introduced `updateTag`, so the
  actions appeared broken for the several steps in between. The caching
  enhancement now replaces `revalidatePath` with tag-based invalidation
  rather than adding revalidation for the first time, and its TODO says so.

## 1.0.2

_Based on Next.js 16.2.9_

### Summary

Documentation-only release. Restructures the written guidance so the README
acts as a chooser between the project's three uses — running the example,
following the tutorial, and building on the starter — and moves the
four-step run-the-example walkthrough into a guide of its own. No lab code
changed, so the lab steps and their tags are unchanged from `1.0.1`.

### Changes

- Extracted the four-step progression (`MOCK` mode, a static token, the
  local single-click app, hosted deployment) out of `README.md` into a new
  `docs/RUN-EXAMPLE-APP.md`, and rewrote the README as a three-option
  chooser pointing at it. Repointed the cross-references in
  `docs/LOCAL-SINGLE-CLICK-APP.md`, `docs/USING-AS-A-STARTER.md`,
  `docs/VERCEL-DEPLOYMENT.md`, and `docs/TUTORIAL.md` from the README's
  Getting Started anchor to the new guide.
- Switched the tutorial's setup instructions from
  `create-next-app -e <tree-url>` to
  [`degit`](https://github.com/Rich-Harris/degit), in Getting Started and
  in each lab's "Fresh setup if needed" block, and added the `git init`
  steps for the learner's own repository.
- Documented the boilerplate segments in `AGENTS.md` (the reference-only
  `depend`, `root`, `mock-data`, and `boilerplate` tag pairs) and added a
  "The Boilerplate" section to `docs/TUTORIAL.md` linking each segment's
  diff, so a learner can review how the scaffolding was assembled.
- Added a warning to `docs/ARCHITECTURE.md` and the caching enhancement in
  `docs/TUTORIAL.md` that caching may be the wrong trade-off for an
  admin-targeted app, noting that the example invalidates on its own
  actions but serves stale data when a store changes externally, and
  recommending webhook-driven invalidation.
- Added upstream documentation links for the three tunneling options (VS
  Code port forwarding, GitHub Codespaces, and the ngrok agent) in
  `docs/LOCAL-SINGLE-CLICK-APP.md`, and short descriptions for the
  uninstall and caching enhancements in `docs/TUTORIAL.md`.
- Added `ARTIFACTS/*` to `.gitignore`.

## 1.0.1

_Based on Next.js 16.2.9_

### Summary

Documentation-only release. Expands the project's written guidance from a
single pointer-style README into a set of task-oriented guides covering
running the example app, running it locally as a real single-click app,
deploying it, and building on it as a starter. No lab code changed, so the
lab steps and their tags are unchanged from `1.0.0`.

### Changes

- Rewrote `README.md` as a staged onboarding path: what a single-click app
  is, what the BigCommerce developer portal provides (client credentials,
  callback URLs, OAuth scopes), and a four-step progression from `MOCK`
  mode through a static token, the full install/session flow, and
  deployment.
- Added `docs/LOCAL-SINGLE-CLICK-APP.md`, covering `MULTITENANT` mode, a
  public HTTPS tunnel to the dev server, and the minimum developer-portal
  configuration needed to install locally.
- Added `docs/USING-AS-A-STARTER.md`, covering removal of the gift
  certificates example feature and which layers to keep when building a
  real app.
- Added `docs/VERCEL-DEPLOYMENT.md`, covering deployment with a hosted
  Postgres database.
- Expanded `docs/ARCHITECTURE.md`.
- Resolved the two outstanding `TODO:` placeholders in `docs/TUTORIAL.md`
  into links to the new local-setup and deployment guides, added the
  dependency-install and dev-server commands to Getting Started, and
  grouped the enhancements under a "Taking It Further" section.

## 1.0.0

_Based on Next.js 16.2.9_

### Summary

Initial project-versioned progressive history. Establishes the lab's own
version line (separate from the base-framework version) and the
supporting structure: a tutorial document, a changelog, and the
traditional-branch / progressive-history Git model.

### Changes

- Introduced project versioning in `package.json` (`version`), tagged on
  the progressive history tip.
- Built the first progressive history: clean Next.js install,
  setup/boilerplate, and strict 1:1 TODO → code lab steps across 5 main
  labs (BigDesign UI, the REST API client, the single-click app auth
  workflow, session tracking, and the Postgres driver) plus 8
  enhancements (uninstall/remove-user, caching, rate-limiting, the
  Customers feature, gift certificate transfer-to-store-credit and
  account decoration, the GraphQL client and App Extension registration,
  control panel links, and opt-in Vercel deployment scaffolding).
- Added `docs/TUTORIAL.md` (with a "Based on version" banner),
  `docs/ARCHITECTURE.md`, this `CHANGELOG.md`, and `AGENTS.md` / `CLAUDE.md`
  documenting the lab repo model and conventions.
- Recorded the base-framework release as a `framework-16.2.9` anchor tag.
