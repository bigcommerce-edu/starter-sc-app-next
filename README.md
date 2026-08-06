# BigCommerce Single-Click App Starter

A starter Next.js app for building a BigCommerce single-click installable
app, with a gift certificates manager included as a worked example. See
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full design (auth/session
flow, data modes, credentials storage, API clients, caching).

## Getting started

1. Copy `.env.example` to `.env.local` and fill in the required values.
2. Install dependencies and start the dev server:

   ```bash
   pnpm install
   pnpm dev
   ```

3. Open [http://localhost:3000](http://localhost:3000).

By default the app runs in `MOCK` mode (no BigCommerce account or store
needed). See `.env.example` for `STATIC` (a single real store/token) and
`MULTITENANT` (the real production install/session flow) modes.

## Deployment

Hosting-specific tooling is opt-in via `pnpm scaffold <profile>` (see
`scripts/scaffold.mjs`) rather than baked into the base app, so this starter
can target any provider. Run `pnpm scaffold vercel` to add Vercel + Postgres
deployment scaffolding.

## Removing the example feature

`src/components/gift-certs-manager` and `src/lib/gift-certs-manager` (and
their routes) are a worked example demonstrating patterns worth
understanding — see docs/ARCHITECTURE.md — but are meant to be removed when
building a real app on top of this starter. The auth/session/API-client/
credentials layers are not part of the example and should stay.

## Lab Exercises

See [docs/TUTORIAL.md](docs/TUTORIAL.md) for a step-by-step breakdown of how
this app was built, with diffs for each step.
