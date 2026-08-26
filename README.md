# BigCommerce Starter Single-Click App

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
and [Single-Click App OAuth Flow](https://docs.bigcommerce.com/developer/docs/integrations/apps/guide/auth)
for the wider context.

You can get started with this app without the Developer Portal dependency, but the full functionality exists for the context of a single-click app.

## Using This App

This app is intended as an example, tutorial, and starter. Choose the path that best fits your goals:

### Option 1: Run the Example App

If you just want a quick start with the fully functional Gift Certificates Manager example,
you can clone and run the app in a few easy steps.

See [docs/RUN-EXAMPLE-APP.md](docs/RUN-EXAMPLE-APP.md) for quick setup instructions, which detail the configuration steps
to go from a dependency-free start with mock records all the way through a functional single-click app connected to your
own store's data.

The example app demonstrates full implementations of core patterns.

### Option 2: Use the App as a Tutorial

Rather than reading the finished code, you can build it. To install starting boilerplate and then explore the step-by-step process of adding critical functionality (like BigDesign-based UI, REST API calls, and authentication/session management), start with [docs/TUTORIAL.md](docs/TUTORIAL.md).

### Option 3: Use the App as a Starter

This starter app clearly separates its example use case from core libraries that support authentication, storage, session management, and BigCommerce API interactions.

If you just want to get started building your own app on this foundation, follow [docs/USING-AS-A-STARTER.md](docs/USING-AS-A-STARTER.md) for a guide on what to remove and update.

## BigDesign and React 19

> [!WARNING]
> **BigDesign does not officially support React 19.** 

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
