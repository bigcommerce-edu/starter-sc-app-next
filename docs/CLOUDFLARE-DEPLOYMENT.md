# Deploying to Cloudflare

This guide covers deploying this app to Cloudflare Workers as a hosted
BigCommerce single-click app, using `@opennextjs/cloudflare` to adapt the
Next.js build for the Workers runtime, with D1 for durable storage.

This covers step 4 of the four-step strategy in
[Run the Example App](./RUN-EXAMPLE-APP.md) — the deployed, multitenant app —
as an alternative to [deploying on Vercel](./VERCEL-DEPLOYMENT.md). Working
through
[Running Locally as a Single-Click App](./LOCAL-SINGLE-CLICK-APP.md) first is
recommended but not required — the concepts (`MULTITENANT` mode,
`APP_ORIGIN`, the developer portal callbacks) are the same, with a real host
and a real database in place of a tunnel and a SQLite file.

## Supported Infrastructure

Next.js caching on Workers is assembled from several separate pieces, because
there's no single storage primitive that does all of it well:

* **R2** — the incremental cache. Stores the cached response payloads
  themselves. Object storage is the right fit: payloads are large-ish, written
  once, and read many times.
* **D1** — the cache tag store. Maps each cache tag to the timestamp it was
  last revalidated, which is what makes on-demand `revalidateTag()` work. This
  is a small, high-churn relational workload, so SQLite-backed D1 fits where R2
  would not.
* **Durable Objects** — the revalidation queue (`DOQueueHandler`) and the
  cache purge buffer (`BucketCachePurge`). Both exist to collapse bursts into
  single operations: the queue deduplicates concurrent revalidations of the
  same route, and the purge buffer batches tag invalidations behind an alarm.

Alongside those, a fourth resource holds application data rather than cache
state:

* **D1** — the credentials store. Holds each installed store's encrypted API
  token, its authorized users, and its registered App Extension. This is the
  app's system of record.

The cache-tag D1 database is deliberately **separate** from that
system-of-record database. It's cache bookkeeping rather than application
data, with a completely different churn and durability profile, and keeping
them apart means neither one's scaling or backup story constrains the other.

## Deployment Order

The steps below are ordered around a chicken-and-egg problem: `APP_ORIGIN`
and the developer portal's callback URLs both need the deployment's final
URL, which doesn't exist until you've deployed at least once.

The order works around that by deploying first in `MOCK` mode — which needs
no BigCommerce credentials and no database — verifying the deployment is
healthy, then layering on the real configuration:

1. [Scaffold the Cloudflare tooling](#1-scaffold-the-cloudflare-tooling) and
   commit it.
2. [Create the Cloudflare resources](#2-create-the-cloudflare-resources) and
   write `wrangler.jsonc`.
3. [Deploy in MOCK mode](#3-deploy-in-mock-mode) and get the Worker's URL.
4. [Verify the deployment](#4-verify-the-deployment-in-mock-mode).
5. [Register the app](#5-register-the-app-in-the-developer-portal) in the
   developer portal.
6. [Set the remaining configuration](#6-set-the-remaining-configuration) and
   switch to `MULTITENANT`.
7. [Redeploy and install](#7-redeploy-and-install).

Unlike a Vercel deploy, the resources come before the first deploy: a Worker
won't start without the bindings its `wrangler.jsonc` declares.

## Prerequisites

You'll need the Wrangler CLI authenticated against your Cloudflare account:

```shell
pnpm wrangler login
```

Confirm it's pointed at the account you expect before creating resources:

```shell
pnpm wrangler whoami
```

If your login has access to more than one account, note the account ID — some
of the commands below will prompt you to pick one, and creating a bucket or
database in the wrong account is easy to do and annoying to unwind.

## 1. Scaffold the Cloudflare Tooling

```shell
pnpm scaffold cloudflare
```

This is the only step that changes the app's own code. It:

* **Switches the caching implementation.** Cache Components can't run on
  Workers, so the app moves to fetch-level caching and `cacheComponents` is set
  to `false` in `next.config.ts`. See
  [CACHE-IMPLEMENTATION-SWAP.md](./CACHE-IMPLEMENTATION-SWAP.md) for what that
  changes and what you have to maintain afterwards.
* **Installs the Cloudflare D1 loader** over
  `src/lib/credentials-store/d1-driver-loader.ts`. The core version throws,
  because obtaining a D1 binding is Workers-specific; the installed one reads
  it off the Worker env.
* **Renames `src/proxy.ts` to `src/middleware.ts`**, and its exported function
  to match. `proxy` is Next 16's current convention, and `middleware` is
  deprecated, which is why the app ships with `proxy.ts` — but Next only
  records a middleware entry in `.next/server/middleware-manifest.json` under
  the `middleware` name. OpenNext reads that manifest to decide whether there
  is middleware to bundle, so without the rename the authorization gate in
  that file is silently missing from the deployed Worker. Expect a
  deprecation warning on every build afterwards; it's the cost of being
  bundled at all.
* **Adds `@opennextjs/cloudflare` and `wrangler`** to `package.json`, along
  with the `preview`, `deploy`, `upload`, `cf-typegen`, `d1:migrate`, and
  `d1:migrate:remote` scripts.
* **Writes `open-next.config.ts`** and four example files:
  `wrangler.jsonc.example`, `.secrets.production.example`,
  `.env.production.local.example`, and `.dev.vars.example`.

After the scaffold, install dependencies:

```shell
pnpm install
```

### Create `wrangler.jsonc`

Every resource name and id in that file is specific to your Cloudflare
account, so the script writes `wrangler.jsonc.example` with placeholders and
leaves the real file to you. Copy it once you've created the resources in the
next few steps:

```shell
cp wrangler.jsonc.example wrangler.jsonc
```

## 2. Create the Cloudflare Resources

Every binding the Worker declares has to exist before it will start, so
these come before the first deploy. Record each name and id as you go —
`wrangler.jsonc.example` has a placeholder for each.

### Create the R2 Bucket

```shell
pnpm wrangler r2 bucket create {{APP-NAME}}-cache
```

Verify it exists:

```shell
pnpm wrangler r2 bucket list
```

### Create the Cache Tag D1 Database

```shell
pnpm wrangler d1 create {{APP-NAME}}-cache-tags
```

Record the name and the `database_id` the command
prints.

Verify it exists:

```shell
pnpm wrangler d1 list
```

### Create the Credentials Store D1 Database

```shell
pnpm wrangler d1 create {{APP-NAME}}-credentials
```

Record the name and the printed `database_id`.

Verify it exists:

```shell
pnpm wrangler d1 list
```

### Fill in Resource Details in Config

Replace placeholders in `wrangler.jsonc` with the appropriate values:

| Placeholder | Value | Where it comes from |
| ----------- | ----- | ------------------- |
| `{{APP_NAME}}` | Your Worker's name (appears twice) | Your choice; conventionally `package.json`'s `name` |
| `{{CACHE_BUCKET_NAME}}` | R2 bucket name | The name you passed to `r2 bucket create` |
| `{{TAG_CACHE_DB_NAME}}` | Cache-tag database name | The name you passed to `d1 create` |
| `{{TAG_CACHE_DB_UUID}}` | Cache-tag `database_id` | Printed by `d1 create` |
| `{{CREDENTIALS_DB_NAME}}` | Credentials database name | The name you passed to `d1 create` |
| `{{CREDENTIALS_DB_UUID}}` | Credentials `database_id` | Printed by `d1 create` |

Find the `{{CREDENTIALS_DB_NAME}}` placeholder in the 
`d1:migrate` and `d1:migrate:remote` scripts in `package.json`. Replace it in both places with
the name of the credentials database.

### Generate Cloudflare Types

With every placeholder in `wrangler.jsonc` filled in, run the following:

```shell
pnpm cf-typegen
```

That regenerates `cloudflare-env.d.ts` and fails on a malformed config. Every
binding you declared should appear in the generated `CloudflareEnv` interface.

## 3. Deploy in MOCK Mode

Set `DATA_MODE` to `MOCK` in `wrangler.jsonc`'s `vars` for this first
deploy:

```jsonc
"vars": {
  "DATA_MODE": "MOCK",
  ...
}
```

`MOCK` is the app's default when unset, but setting it explicitly makes the
intermediate state obvious to anyone reading the config later.

`.secrets.production` has to exist before you deploy, because `pnpm deploy`
uploads it — but in `MOCK` mode every value in it can be empty:

```shell
cp .secrets.production.example .secrets.production
```

Then deploy:

```shell
pnpm deploy
```

That runs the credentials-store migrations against the remote D1 database,
uploads the secrets, builds through `@opennextjs/cloudflare`, and deploys.

Wrangler prints the Worker's URL when it finishes — of the form
`https://<worker-name>.<subdomain>.workers.dev`. That's the origin the next
steps need.

## 4. Verify the Deployment in MOCK Mode

Open the `workers.dev` URL. In `MOCK` mode the root-level routes under
`app/(root)` serve real content, so you should see the gift certificates list
rendered with in-memory mock data, a data-mode banner, and working navigation
to the customers pages.

This confirms the build, the Workers runtime, the OpenNext adapter, and the
UI all work before any BigCommerce or database configuration is involved. If
something is broken here, it's a build or hosting problem rather than an auth
or storage one — a much smaller thing to debug.

Tail the logs if a page errors:

```shell
pnpm wrangler tail
```

## 5. Register the App in the Developer Portal

Create the app record in the
[BigCommerce developer portal](https://build.bigcommerce.com/) and point its
callbacks at the Worker's URL.

1. Create a new app (or reuse the draft app from local development — but note
   that its callback URLs point at your tunnel, so either update them or keep
   a separate app record per environment; a separate record is cleaner, since
   it lets local and deployed installs coexist).
2. On the **Technical** tab, set the callback URLs, substituting your Worker
   origin for `<APP_ORIGIN>`:

   | Callback | URL |
   | --- | --- |
   | Auth | `<APP_ORIGIN>/api/app/auth` |
   | Load | `<APP_ORIGIN>/api/app/load` |
   | Uninstall | `<APP_ORIGIN>/api/app/uninstall` |
   | Remove User | `<APP_ORIGIN>/api/app/remove_user` |

3. On the **Scopes** tab, enable at minimum:

   * **Customers**: modify
   * **Marketing**: modify
   * **Channel Settings**: read-only
   * **Channel Listings**: read-only
   * **Information & Settings**: read-only
   * **App Extensions**: manage

4. Copy the **Client ID** and **Client Secret** for the next step.

See the [local guide](./LOCAL-SINGLE-CLICK-APP.md#registering-the-app-in-the-developer-portal)
for more detail on the app profile and what each scope is for.

## 6. Set the Remaining Configuration

Copy the remaining config file templates:

```shell
cp .dev.vars.example .dev.vars
cp .env.production.local.example .env.production.local
```

You should already have `.secrets.production`.

Env vars are set in files appropriate to their purpose:
- `wrangler.jsonc`: Set values that are non-sensitive and not
environment-specific in `vars`. Under version control.
- `.secrets.production`: Set values that are sensitive or environment-specific. Excluded from version control.
- `.env.production.local`: This file overrides other `.env` files for the _build_ step of a deploy. Any vars the production
requires during build must be duplicated here. Excluded from 
version control.
- `.dev.vars`: Values used when running a Cloudflare preview
with `pnpm run preview`. This is a core Cloudflare/Wrangler
convention. Excluded from version control.

In `wrangler.jsonc`, set in `vars`:

| Variable | Value |
| --- | --- |
| `DATA_MODE` | `MULTITENANT` (changed from `MOCK`) |
| `CREDENTIALS_STORE_DRIVER` | `D1` |
| `CACHE_ENABLED` | `TRUE` or `FALSE` |
| `DEVELOPER_NAME`, `SUPPORT_EMAIL`, `SUPPORT_URL`, `SUPPORT_PHONE`, `DEVELOPER_LOGO_FILENAME` | Your own branding, shown in the app shell |
| `LOG_API_REQUESTS` | `TRUE` or `FALSE` |
| `ERROR_LOGGING_ENABLED` | `TRUE` or `FALSE` |

In `.env.production.local`, set (matching `wrangler.jsonc`):

| Variable | Value |
| --- | --- |
| `CREDENTIALS_STORE_DRIVER` | `D1` |

In `.secrets.production`, set:

| Variable | Value |
| --- | --- |
| `APP_ORIGIN` | Your Worker URL, no trailing slash |
| `BIGCOMMERCE_CLIENT_ID` | From the developer portal |
| `BIGCOMMERCE_CLIENT_SECRET` | From the developer portal |
| `SESSION_SECRET` | Generated (see below) |
| `CREDENTIALS_ENCRYPTION_KEY` | Generated (see below) |
| `STATIC_STORE_HASH`, `STATIC_STORE_TOKEN` | Leave empty outside `STATIC` mode |

Generate each secret separately:

```shell
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```

Use fresh values rather than reusing your local ones, and treat them as
production secrets. Note that `CREDENTIALS_ENCRYPTION_KEY` encrypts stored
access tokens at rest — changing it later makes every already-stored token
undecryptable, forcing every store to reinstall.

`APP_ORIGIN` must exactly match the origin in the developer portal's Auth
callback URL. It's the source of truth for the OAuth `redirect_uri` and is
never derived from the incoming request, since behind Cloudflare's proxy the
observed host isn't guaranteed to match the public origin BigCommerce called.

To use `pnpm run preview`, set the same vars from `.secrets.production`
in `.dev.vars`, using different values as appropriate.

## 7. Redeploy and Install

Configuration changes don't apply to the running Worker until you deploy
again:

```shell
pnpm deploy
```

Watch the output to confirm the migration step ran against the remote
database rather than reporting nothing to apply. That's the credentials
schema being created in D1.

Then install the app:

1. In your store's control panel, go to **Apps > My Apps > My Draft Apps**
   and install your app.
2. BigCommerce calls `/api/app/auth`, which exchanges the code for a token,
   persists the store to D1, registers the app extension, and redirects into
   `/store/<storeHash>/`.
3. Confirm the app renders in the control panel iframe with real store data.

## Troubleshooting

**The build fails on `pg` or `pg-cloudflare`.** `CREDENTIALS_STORE_DRIVER`
was `POSTGRES` at build time. It's read from `.env.production.local`, not
from `wrangler.jsonc` — see "Select the D1 Driver" above.

**The build fails to resolve `@opennextjs/cloudflare`.** The scaffold adds
the dependency but doesn't install it. Run `pnpm install`.

**`No migrations present at ./migrations`.** The `{{CREDENTIALS_DB_NAME}}`
placeholder is still in the `d1:migrate` scripts in `package.json`. Wrangler
can't resolve the database name, so it falls back to a top-level
`migrations/` directory that doesn't exist. Nothing was migrated.

**Install redirects to an app error page.** Check the reason on
`/app-error?reason=...` and `pnpm wrangler tail`. A token exchange failure
means credentials or a `redirect_uri`/`APP_ORIGIN` mismatch; a save failure
means the credentials database — confirm the `CREDENTIALS_D1` binding and
that migrations ran.

**The app installs but every page is unauthorized.** Usually the session
cookie: it requires HTTPS and a correct `APP_ORIGIN`. Confirm `APP_ORIGIN`
matches the origin you're actually being served from. If the authorization
gate seems to be missing entirely rather than rejecting, confirm
`src/middleware.ts` exists — Next records middleware only under that
filename, and the scaffold renames `proxy.ts` for exactly that reason.

**Pages render but nothing is ever cached.** Confirm `CACHE_ENABLED` is
`TRUE` and that the cache bindings in `wrangler.jsonc` still use their
OpenNext-defined names. Renaming one silently disables that layer.

## Checklist: Pointing a Real Domain at Your App

Once you attach a custom domain (e.g. `https://app.example.com`) to the
Worker, the app's public origin changes — and several things that hardcode
the old `*.workers.dev` origin have to be updated together. A partial update
leaves the app in a state where installs fail or sessions break, so treat
this as one atomic change:

1. **Add the custom domain** to the Worker in the Cloudflare dashboard
   (**Workers & Pages > your Worker > Settings > Domains & Routes**), and
   confirm it serves the app over HTTPS.
2. **Update `APP_ORIGIN`** in `.secrets.production` to the new origin, with
   no trailing slash.
3. **Update all four callback URLs** in the developer portal to the new
   origin: `/api/app/auth`, `/api/app/load`, `/api/app/uninstall`, and
   `/api/app/remove_user`. The Auth callback in particular must match
   `APP_ORIGIN` exactly or the OAuth token exchange is rejected.
4. **Consider enabling cache purging**, which a custom domain makes possible
   for the first time. Set `CACHE_PURGE_ZONE_ID` in `wrangler.jsonc`'s `vars`
   and `CACHE_PURGE_API_TOKEN` in `.secrets.production`.
5. **Redeploy** with `pnpm deploy`, so the new `APP_ORIGIN` is picked up at
   both build and runtime.

If you keep the `*.workers.dev` URL working alongside the custom domain, be
aware only one can be `APP_ORIGIN`. Requests arriving on the other will still
render, but redirects and the OAuth `redirect_uri` will point at
`APP_ORIGIN` — which is why installs must be done against the canonical
domain.

## Further Info

### Credentials DB Migrations

Migrations with the schema for the credentials storage are in
`src/lib/credentials-store/d1-driver/migrations/`.

The scaffolded scripts run them for you: `pnpm preview` runs `d1:migrate`
against the local database, and `pnpm deploy` runs `d1:migrate:remote`
against the deployed one. Both stop if the migration fails, so a deploy can't
get ahead of its schema.

To apply them by hand:

```shell
pnpm wrangler d1 migrations apply {{APP-NAME}}-credentials --remote
```

### The Cache Overrides

`open-next.config.ts` implements the proper overrides for
caching on Cloudflare infrastructure.

#### Cache Purging Needs a Zone

The `cachePurge` layer is the one piece that does **not** work on a plain
`*.workers.dev` deploy. It ultimately calls the Cloudflare zone purge API,
which needs two additional environment values:

* `CACHE_PURGE_ZONE_ID`
* `CACHE_PURGE_API_TOKEN`

Without both, it logs `No cache zone ID or API token provided. Skipping cache
purge.` and returns. That's a no-op, not an error — the R2, D1, and queue
layers are unaffected and work fine without a zone.

Setting those up requires a custom domain attached to a Cloudflare zone you
control. Until then, expect that log line on every path invalidation and treat
it as informational. When you do add a zone, `CACHE_PURGE_API_TOKEN` is a
credential and belongs in `.secrets.production`, not in `wrangler.jsonc`.






## Reference

* [CACHE-IMPLEMENTATION-SWAP.md](./CACHE-IMPLEMENTATION-SWAP.md) — how the
  caching implementation is switched, and what to maintain afterwards
* [VERCEL-DEPLOYMENT.md](./VERCEL-DEPLOYMENT.md) — the same walkthrough for
  the Vercel target
* [OpenNext Cloudflare caching docs](https://opennext.js.org/cloudflare/caching)
* [Cloudflare R2 documentation](https://developers.cloudflare.com/r2/)
* [Cloudflare D1 documentation](https://developers.cloudflare.com/d1/)
* [D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/)
* [Durable Objects documentation](https://developers.cloudflare.com/durable-objects/)

