# Changelog

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
