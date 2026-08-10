# Changelog

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
