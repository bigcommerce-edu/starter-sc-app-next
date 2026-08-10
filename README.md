# BigCommerce Single-Click App Starter

A starter Next.js app for building a BigCommerce single-click installable
app — an app a merchant installs from their store's control panel with one
click, which then runs inside that control panel and manages the merchant's
store data on their behalf.

The starter provides the layers every such app needs: the OAuth install and
launch flow, session management and per-request authorization, per-store
credential storage, BigCommerce REST and GraphQL API clients with rate-limit
and timeout handling, caching, and error handling. A gift certificates
manager is included as a worked example feature, demonstrating those layers
in something real and complete.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full design and the
reasoning behind it — data modes, the install/session flow, two-tier
authorization, credentials storage, the API clients, caching, and error
handling.

## The BigCommerce Developer Portal

A single-click app isn't a standalone website; it's an app **registered with
BigCommerce**. Registration happens in the
[BigCommerce developer portal](https://build.bigcommerce.com/), and it's
what makes an app installable into a store.

The portal is where you:

* Create the app record and get its **Client ID** and **Client Secret**, the
  credentials this app uses to exchange an install code for a store access
  token.
* Declare the app's **callback URLs** — the endpoints BigCommerce calls to
  install the app (`/api/app/auth`), launch it (`/api/app/load`), and notify
  it of removals (`/api/app/uninstall`, `/api/app/remove_user`). These map
  directly to the route handlers in `src/app/api/app/`.
* Choose the **OAuth scopes** the app requests, which bound what its access
  token can do.

Creating a developer portal account is free and doesn't require a
partnership (that's only needed to publish to the BigCommerce App
Marketplace). You'll also want a sandbox or trial store you can install
into. See BigCommerce's
[Beginning App Development](https://docs.bigcommerce.com/developer/docs/integrations/apps/guide/beginning-development)
and
[Single-Click App OAuth Flow](https://docs.bigcommerce.com/developer/docs/integrations/apps/guide/auth)
for the wider context.

Steps 1 and 2 of Getting Started need none of this. It first becomes
relevant at step 3.

## Getting Started

This is the quick path to getting **the existing example app** up and
running. It's organized as four steps of increasing infrastructure, and each
one is a complete working state you can stop at.

Every step adds exactly one category of thing that can go wrong, which is
what makes this worth following in order rather than jumping straight to the
end. Steps 1 and 2 need nothing but a checkout.

### Step 1: Run Locally in MOCK Mode

Zero hosting, database, BigCommerce account, or store setup required.

```shell
git clone https://github.com/bigcommerce-edu/starter-sc-app-next.git
cd starter-sc-app-next
pnpm install
cp .env.example .env.local
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). `DATA_MODE` defaults to
`MOCK`, so no real API calls are made and every page is served from
in-memory mock data with no authentication. The example feature is fully
browsable.

This is the fastest feedback loop for UI work, and where any problem is
unambiguously in your own code.

### Step 2: Add a Static API Token and Run in STATIC Mode

Real BigCommerce API calls against a single real store, still with no
install flow, no session handling, and no database.

In your store's control panel, create a store-level API account
(**Settings > API > Store-level API accounts**) with read/write scopes for
Marketing (gift certificates), Customers, and Information & Settings. Then in
`.env.local`:

```dotenv
DATA_MODE=STATIC
STATIC_STORE_HASH=your-store-hash
STATIC_STORE_TOKEN=your-access-token
```

Restart the dev server. Every request now uses that one token, so the app
renders your real store's data.

This is where real API response shapes, pagination behavior, error codes, and
rate limits show up — integration issues, separated from everything auth
related.

Both step 1 and step 2 render at root-level routes under `app/(root)`, which
exist precisely because there's no store context in these modes.

### Step 3: Run Locally as a Single-Click App

Now the app becomes a real single-click app: installed into a store from its
control panel, rendered inside that control panel's iframe, and
authenticated per user and per store. Instead of one hardcoded token, each
store's access token is obtained during install and looked up per request
from durable storage.

Three things change:

* **`DATA_MODE=MULTITENANT`.** Every request is scoped to a store through
  the `/store/[storeHash]` route segment and authorized by the app's own
  session cookie. The root-level dev routes stop serving content.
* **A public HTTPS URL is required.** BigCommerce's servers call your
  callbacks over the internet and render the app in an iframe, so
  `localhost` alone won't do. A tunneling or port-forwarding service exposes
  your dev server publicly — VS Code port forwarding, a GitHub Codespace, or
  ngrok all work. That public URL goes in `APP_ORIGIN` and in the developer
  portal's callback URLs.
* **Local SQLite storage.** Store access tokens, users, and store-user links
  persist to a plain file at `data/credentials.sqlite`
  (`CREDENTIALS_STORE_DRIVER=SQLITE`), created automatically and gitignored.
  No external database, no migration step. Tokens are encrypted at rest.

This exercises the install flow, session cookie, authorization gates, and
cross-origin iframe behavior — all locally.

See [docs/LOCAL-SINGLE-CLICK-APP.md](docs/LOCAL-SINGLE-CLICK-APP.md) for the
full walkthrough, including the three tunneling options and the minimal
developer portal setup.

### Step 4: Run in a Hosted Environment as a Single-Click App

The same multitenant app, deployed — which is what a merchant would actually
install.

Hosting changes one thing fundamentally: SQLite no longer works. A real
deployment runs multiple short-lived instances with an ephemeral filesystem,
so a local database file would differ per instance and could vanish between
requests. Credentials need a **shared remote database** every instance can
see, which is what the Postgres driver
(`CREDENTIALS_STORE_DRIVER=POSTGRES`) provides.

Hosting-specific tooling is opt-in via `pnpm scaffold <profile>` rather than
baked into the app, so this starter can target any provider. **Vercel** is
the provider with built-in support today (`pnpm scaffold vercel`), paired
with Neon Postgres.

See [docs/VERCEL-DEPLOYMENT.md](docs/VERCEL-DEPLOYMENT.md) for the full
deployment walkthrough, ordered to work around the fact that `APP_ORIGIN` and
the portal's callback URLs both need a URL that doesn't exist until you've
deployed once.

## Using This App as a Tutorial

Rather than reading the finished code, you can build it. This repository
maintains a tutorial-shaped commit history: starting from basic boilerplate,
you implement each layer yourself, in order, with a diff for every step.

The progression runs through five main labs — the BigDesign UI, the REST API
client, the single-click app auth workflow, session tracking and
authentication, and the Postgres driver — followed by enhancements covering
uninstall callbacks, caching, rate limiting, the customers feature, GraphQL
and app extensions, control panel links, and deployment scaffolding.

Each lab step is a pair of commits: one that introduces `TODO:` comments
marking what to write, and one that resolves them. You work the TODOs, then
compare against the implementation.

See [docs/TUTORIAL.md](docs/TUTORIAL.md) for the labs and their diffs.

## Using This App as a Starter

To build your own app on this foundation, the essential idea is that the
gift certificates manager is disposable and everything underneath it isn't.
`src/lib/gift-certs-manager`, `src/components/gift-certs-manager`, and their
routes are a worked example meant to be removed once you no longer need the
reference. The auth, session, API client, credentials storage, caching, and
error-handling layers are the actual starter and should stay.

Beyond the keep/remove/update split, there are a handful of patterns
specific to this app worth following in your own features: pass-through
routes for mock-mode development, wrapping every page in `AuthorizedPage`,
how a feature's data access layer is organized in `lib`, and how mock data
handlers are registered.

See [docs/USING-AS-A-STARTER.md](docs/USING-AS-A-STARTER.md) for the full
guide, including how to add your own credentials store driver or hosting
scaffold, and how to trim the data modes down if you don't need them.

## The Gift Certificates Manager Example

The included feature is a working admin UI for a store's gift certificates,
chosen because it exercises the parts of an app that are genuinely
interesting rather than just rendering a list.

What it does:

* **Lists gift certificates** with filtering by code, recipient name, and
  recipient email, plus sorting and pagination. Pagination is stateless —
  BigCommerce's v2 endpoint reports no total count, so "is there a next
  page" is answered by peeking one page ahead through the same cached
  function the real fetch would use.
* **Shows certificate detail** across tabs, with the purchaser and recipient
  on a party panel, decorated with the registered customer account matching
  the recipient's email when one exists.
* **Updates status and refills balance** through Server Actions that
  invalidate the relevant cache tags so changes appear immediately.
* **Transfers a balance to store credit** — debiting the certificate and
  crediting the customer across two independent API calls with no shared
  transaction, including a compensating call if the second one fails. A
  worked example of handling a partial failure honestly.
* **Browses customers** in a separate section, with a list, detail pages, and
  channel decoration, demonstrating a second feature sharing the same
  patterns.
* **Registers an app extension** on install, adding a shortcut to this app
  inside the control panel's own customer pages. Registration is idempotent
  and never blocks an install, with a user-triggered retry banner when it
  fails.
* **Links into the BigCommerce control panel** for native pages the app
  doesn't reimplement, navigating the parent frame from inside a
  cross-origin iframe.

Along the way it demonstrates the app-level concerns worth copying: cache
tagging and invalidation, Suspense boundaries and loading states, Server
Actions returning structured results instead of throwing, mock handlers that
mirror the real API's quirks, and per-request memoization.

[ARCHITECTURE.md](docs/ARCHITECTURE.md) covers the non-obvious decisions in
this feature in detail.
