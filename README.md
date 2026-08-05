# BigCommerce Single-Click App Starter

A starter Next.js app for building a BigCommerce single-click installable
app, with a gift certificates manager included as a worked example.

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
