# BigCommerce Single-Click App Starter

A Next.js starter for building a BigCommerce single-click 
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

A single-click app isn't just a deployed web application; it's an app **registered with
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

You can get started with this app without the Developer Portal dependency, but the full functionality exists for the context of a single-click app.

## Run the Example App

To get the example app up and running with no tutorial or modifications, follow the steps below.

Step 1 is the quickest route to a working UI to explore, and subsequent steps integrate your store's data and the single-click app flow.

(If you want to follow the step-by-step tutorial or just want to start building on the starter foundation, skip this section.)

### Step 1: Run Locally in MOCK Mode

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

### Step 2: Add a Static API Token and Run in STATIC Mode

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

### Step 3: Run Locally as a Single-Click App

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
baked into the app, a strategy that supports your ability to target any hosting provider you choose.

**Vercel** is
the provider with built-in support today (`pnpm scaffold vercel`), paired
with Neon Postgres.

See [docs/VERCEL-DEPLOYMENT.md](docs/VERCEL-DEPLOYMENT.md) for the full
deployment walkthrough.

## Using This App as a Tutorial

Rather than reading the finished code, you can build it. To install starting boilerplate and then explore the step-by-step process of adding critical functionality (like BigDesign-based UI, REST API calls, and authentication/session management), start with [docs/TUTORIAL.md](docs/TUTORIAL.md).

## Using This App as a Starter

This starter app clearly separates its example use case from core libraries that support authentication, storage, session management, and BigCommerce API interactions.

If you just want to get started building your own app on this foundation, follow [docs/USING-AS-A-STARTER.md](docs/USING-AS-A-STARTER.md) for a guide on what to remove and update.

## BigDesign and React 19

> [!WARNING]
> **BigDesign does not officially support React 19.** This is the single
> most important thing to know before upgrading React, BigDesign, or your
> package manager.

All three BigDesign packages (`@bigcommerce/big-design`,
`@bigcommerce/big-design-theme`, and `@bigcommerce/big-design-icons`)
declare a React 18 peer dependency. This app runs **React 19** (required by
Next 16), so every one of those peer ranges is unsatisfied. Installing
without intervention fails or emits loud peer warnings, depending on the
package manager.

Two things in this repo work around that, and **both must stay in place**:

* **The peer dependency override** — `pnpm-workspace.yaml`'s
  `peerDependencyRules.allowedVersions` declares React 19 acceptable for
  each of the three packages, which is what lets `pnpm install` resolve
  cleanly. Removing those entries breaks a fresh install.
* **A patched Modal** — `patchedDependencies` applies
  `patches/@bigcommerce__big-design+modal-removechild-detached-node.patch`,
  which guards `Modal`'s unmount cleanup with a
  `modalContainer.parentNode === document.body` check before calling
  `document.body.removeChild`. React 19 changed unmount ordering enough
  that the container can already be detached by the time that cleanup runs,
  making the unguarded `removeChild` throw. This is a real React 19
  incompatibility in shipped BigDesign code, not just a metadata
  disagreement.

The override is an assertion that the libraries *do* work on React 19, not
a guarantee — as the patch above shows, the assertion isn't free. Treat
React-19-specific breakage in BigDesign components (especially around
mount/unmount lifecycles and portals) as plausible rather than surprising,
and check whether a newer BigDesign has fixed it upstream before writing a
new patch.

Practical consequences:

* **Use `pnpm`.** `npm`/`yarn` don't read `pnpm-workspace.yaml`, so they see
  neither the peer override nor the patch. `npm install` will fail on the
  peer conflict without `--legacy-peer-deps`, and even when forced through,
  it silently skips the Modal patch.
* **Don't hand-edit `pnpm-workspace.yaml` to "clean up" the peer rules.**
  They look like leftover noise and are load-bearing.
* **Re-check the patch when bumping BigDesign.** A version that fixes the
  Modal bug upstream makes the patch fail to apply, which surfaces as an
  install error rather than a silent no-op.

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
