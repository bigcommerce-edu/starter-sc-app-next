# Run the Example App

To get the example app up and running with no tutorial or modifications, follow the steps below.

Step 1 is the quickest route to a working UI to explore, and subsequent steps integrate your store's data and the single-click app flow.

(If you want to follow the step-by-step tutorial or just want to start building on the starter foundation, skip this guide.)

## Step 1: Run Locally in MOCK Mode

Zero hosting, database, BigCommerce account, or store setup required.

```shell
git clone https://github.com/bigcommerce-edu/starter-sc-app-next.git
cd starter-sc-app-next
pnpm install
cp .env.example .env.local
pnpm dev
```

Browse to the local server (`localhost:3000` or your own port). `DATA_MODE` defaults to
`MOCK`, so no real API calls are made and every page is served from
in-memory mock data with no authentication. The example feature is fully
browsable.

When expanding the starter with your own app functionality, this is the fastest feedback loop for UI work, and where any problem is
unambiguously in your own code.

## Step 2: Add a Static API Token and Run in STATIC Mode

Real BigCommerce API calls against a single real store, still with no
install flow, no session handling, and no database.

In your store's control panel, create a store-level API account
(**Settings > API > Store-level API accounts**) with:

- "Modify" scopes for
Marketing (gift certificates) and Customers
- "Read-Only" scopes for Channel Settings, Channel Listings, and Information & Settings. 

Then in
`.env.local`:

```dotenv
DATA_MODE=STATIC
STATIC_STORE_HASH=<your-store-hash>
STATIC_STORE_TOKEN=<your-access-token>
```

Restart the dev server. Every request now uses that one token, so the app
renders your real store's data.

This is where real API response shapes, pagination behavior, error codes, and
rate limits show up — integration issues, separated from everything auth
related.

Both step 1 and step 2 render at root-level routes under `app/(root)`, which
exist precisely because there's no store context in these modes.

## Step 3: Run Locally as a Single-Click App

Add the following configuration to turn your local server into a real single-click app: installed into a store from its
control panel, rendered inside that control panel's iframe, and
authenticated per user and per store. Instead of one hard-coded token, each
store's access token is obtained during install and looked up per request
from durable storage.

Three things change:

* **`DATA_MODE=MULTITENANT`.** in `.env.local`. Every request is scoped to a store through
  the `/store/[storeHash]` route segment and authorized by the app's own
  session cookie. The root-level dev routes stop serving content.
* **A public HTTPS URL is required.** BigCommerce's servers call your
  callbacks and render the app in an iframe, so
  `localhost` alone won't do. A tunneling or port-forwarding service exposes
  your dev server publicly. That public URL goes in `APP_ORIGIN` and in the developer
  portal's callback URLs.
* **Local SQLite storage.** Store access tokens, users, and store-user links
  persist to a plain file at `data/credentials.sqlite`
  (`CREDENTIALS_STORE_DRIVER=SQLITE`), created automatically and gitignored.
  No external database, no migration step. Tokens are encrypted at rest.

This exercises the install flow, session cookie, authorization gates, and
cross-origin iframe behavior — all locally.

See [LOCAL-SINGLE-CLICK-APP.md](./LOCAL-SINGLE-CLICK-APP.md) for the
full walkthrough, including the three tunneling options and the minimal
developer portal setup.

## Step 4: Run in a Hosted Environment as a Single-Click App

The same multitenant app, deployed — which is what a merchant would actually
install.

Hosting changes one thing fundamentally: SQLite no longer works. A real
deployment runs multiple short-lived instances with an ephemeral filesystem,
so a local database file would differ per instance and could vanish between
requests. Credentials need a **shared remote database** every instance can
see, which is what the Postgres driver
(`CREDENTIALS_STORE_DRIVER=POSTGRES`) provides.

Hosting-specific tooling is opt-in via `pnpm scaffold <profile>` rather than
baked into the app, a strategy that supports your ability to target any hosting provider you choose.

**Vercel** is
the provider with built-in support today (`pnpm scaffold vercel`), paired
with Neon Postgres.

See [VERCEL-DEPLOYMENT.md](./VERCEL-DEPLOYMENT.md) for the full
deployment walkthrough.
