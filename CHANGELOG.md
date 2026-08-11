# Changelog

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
