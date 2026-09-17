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

## Why D1 Is Required

Cloudflare runs your app as a Worker: many short-lived isolates with no
persistent filesystem at all. The SQLite driver used for local development
writes to a local file, which a Worker has nowhere to put. The Postgres
driver isn't an option either — `pg` reaches `pg-cloudflare` through a bare
`require()` that can't be bundled for workerd. D1
(`src/lib/credentials-store/d1-driver/`) is the multi-instance counterpart
that does work here: one shared SQLite-compatible database every isolate can
see.

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

It does not run `pnpm install`, so do that next:

```shell
pnpm install
```

The script is idempotent — re-running it after pulling upstream changes only
adds what's missing, and never overwrites a file you've edited.

### It Does Not Create `wrangler.jsonc`

Every resource name and id in that file is specific to your Cloudflare
account, so the script writes `wrangler.jsonc.example` with placeholders and
leaves the real file to you. Copy it once you've created the resources in the
next few steps:

```shell
cp wrangler.jsonc.example wrangler.jsonc
```

Then replace each placeholder:

| Placeholder | Value | Where it comes from |
| ----------- | ----- | ------------------- |
| `{{APP_NAME}}` | Your Worker's name (appears twice) | Your choice; conventionally `package.json`'s `name` |
| `{{CACHE_BUCKET_NAME}}` | R2 bucket name | The name you pass to `r2 bucket create` (step 2) |
| `{{TAG_CACHE_DB_NAME}}` | Cache-tag database name | The name you pass to `d1 create` (step 3) |
| `{{TAG_CACHE_DB_UUID}}` | Cache-tag `database_id` | Printed by `d1 create` (step 3) |
| `{{CREDENTIALS_DB_NAME}}` | Credentials database name | The name you pass to `d1 create` (step 4) |
| `{{CREDENTIALS_DB_UUID}}` | Credentials `database_id` | Printed by `d1 create` (step 4) |

`{{CREDENTIALS_DB_NAME}}` also appears in the `d1:migrate` and
`d1:migrate:remote` scripts in `package.json`. Replace it in both places with
the same name.

If you miss the ones in `package.json`, the migrate step fails with `No
migrations present at ./migrations` rather than anything mentioning the
placeholder — Wrangler can't resolve the database, so it falls back to looking
for a top-level `migrations/` directory that doesn't exist. Nothing is
migrated, so it's a safe failure, just a confusing one.

## 2. Create the Cloudflare Resources

Every binding the Worker declares has to exist before it will start, so
these come before the first deploy. Record each name and id as you go —
`wrangler.jsonc.example` has a placeholder for each.

### Create the R2 Bucket

This bucket holds the incremental cache payloads. Name it whatever you like —
this guide uses `my-app-cache` — and record the name for
`{{CACHE_BUCKET_NAME}}`:

```shell
pnpm wrangler r2 bucket create my-app-cache
```

Verify it exists:

```shell
pnpm wrangler r2 bucket list
```

The *binding* name (`NEXT_INC_CACHE_R2_BUCKET`) must not change — OpenNext
looks that up by name. Only the bucket name is yours to choose.

### Create the Cache Tag D1 Database

This is the separate cache-tag database described above — not the app's own
data:

```shell
pnpm wrangler d1 create my-app-cache-tags
```

Record the name for `{{TAG_CACHE_DB_NAME}}`, and the `database_id` the command
prints for `{{TAG_CACHE_DB_UUID}}`. The config will not deploy until both are
filled in.

Verify it exists:

```shell
pnpm wrangler d1 list
```

#### The Schema Is Created for You

You do **not** need to run any `CREATE TABLE` statements. The `populate-cache`
step that runs as part of `opennextjs-cloudflare deploy` and
`opennextjs-cloudflare preview` issues the `CREATE TABLE IF NOT EXISTS
revalidations (...)` itself, along with idempotent `ALTER TABLE` statements
that add the `stale` and `expire` columns used for stale-while-revalidate.

That step throws if the `NEXT_TAG_CACHE_D1` binding is missing, which is the
other reason the binding name matters.

If you want to inspect the table after a deploy:

```shell
pnpm wrangler d1 execute my-app-cache-tags --remote \
  --command "SELECT * FROM revalidations LIMIT 10;"
```

### Create the Credentials Store D1 Database

This is the app's own system-of-record database — the one that stores each
installing store's encrypted API token, its users, and its registered App
Extension. It is **separate** from the cache-tag database created above, for
the reasons in "Supported Infrastructure": different churn, different
durability expectations, and no reason for either to constrain the other.

```shell
pnpm wrangler d1 create my-app-credentials
```

Record the name for `{{CREDENTIALS_DB_NAME}}` and the printed `database_id`
for `{{CREDENTIALS_DB_UUID}}`. Remember that this name also has to go into the
`d1:migrate` and `d1:migrate:remote` scripts in `package.json`.

Unlike the OpenNext cache bindings, `CREDENTIALS_D1` is this app's own name
rather than one the adapter looks up. If you change it, change
`D1_BINDING_NAME` in `src/lib/credentials-store/d1-driver/get-database.ts` to
match.

#### Apply the Schema Migrations

Unlike the cache-tag database, this one's schema isn't created by OpenNext —
it comes from the migrations in
`src/lib/credentials-store/d1-driver/migrations/`.

The scaffolded scripts run them for you: `pnpm preview` runs `d1:migrate`
against the local database first, and `pnpm deploy` runs `d1:migrate:remote`
against the deployed one. Both stop if the migration fails, so a deploy can't
get ahead of its schema.

To apply them by hand:

```shell
pnpm wrangler d1 migrations apply my-app-credentials --remote
```

The `--remote` flag is what distinguishes the deployed database from the local
one `wrangler dev` uses. The two are entirely separate, and a fresh checkout
needs both.

Migrations live in `src/lib/credentials-store/d1-driver/migrations/`, next to
the driver they belong to, rather than in a top-level `migrations/` folder.
That's the `migrations_dir` setting on the `CREDENTIALS_D1` binding in
`wrangler.jsonc` — it mirrors how the Postgres driver keeps its own
migrations under `postgres-driver/migrations/`.

To add a migration later, let Wrangler generate the correctly-numbered file
rather than hand-naming it:

```shell
pnpm wrangler d1 migrations create my-app-credentials add_some_table
```

Check what has and hasn't been applied:

```shell
pnpm wrangler d1 migrations list my-app-credentials --remote
```

### Durable Objects Need No Provisioning Step

There's no `wrangler ... create` command for the two Durable Objects. They're
provisioned automatically on first deploy, from the `exports` block in
`wrangler.jsonc`:

* `DOQueueHandler` — the revalidation queue.
* `BucketCachePurge` — the cache purge buffer.

Both are declared with `storage: "sqlite"`, which they require. Both class
names resolve against the built Worker's own exports — the OpenNext worker
template re-exports them unconditionally, so `.open-next/worker.js` already
provides them and there's nothing to import yourself.

Note that `DOQueueHandler` calls back into this Worker through the
`WORKER_SELF_REFERENCE` service binding. That binding already exists in
`wrangler.jsonc` and its `service` value must stay equal to the Worker's
`name`, or revalidation will fail at runtime while everything else appears
healthy.

### The Cache Overrides

Creating the resources and declaring the bindings is not enough on its own —
`open-next.config.ts` is what activates them. Every override defaults to
`"dummy"` (a no-op) when omitted, so an unreferenced binding changes nothing.

That file is now wired up with four overrides:

* `incrementalCache: r2IncrementalCache` — payloads to R2.
* `tagCache: d1NextTagCache` — tag revalidation timestamps to D1.
* `queue: doQueue` — revalidations through the `DOQueueHandler` Durable Object.
* `cachePurge: purgeCache({ type: "durableObject" })` — edge CDN purges
  buffered through `BucketCachePurge`.

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

### Validate the Configuration

With every placeholder in `wrangler.jsonc` filled in, check that the config
itself is valid:

```shell
pnpm cf-typegen
```

That regenerates `cloudflare-env.d.ts` and fails on a malformed config. Every
binding you declared should appear in the generated `CloudflareEnv` interface.

You can also build and run against the Workers runtime locally before
deploying:

```shell
pnpm preview
```

That applies the migrations to the *local* D1 database, so a fresh checkout
needs it once before previewing.

## 3. Deploy in MOCK Mode

Set `DATA_MODE` to `MOCK` in `wrangler.jsonc`'s `vars` for this first
deploy — the scaffolded example ships `MULTITENANT`, which is where you'll
end up, but `MOCK` needs no BigCommerce credentials and no stored
credentials:

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

Cloudflare splits this across two files, by sensitivity. Non-sensitive
settings live in `wrangler.jsonc`'s `vars`, which is committed; anything
sensitive or environment-specific goes in `.secrets.production`, which is
gitignored and uploaded by `pnpm deploy`.

In `wrangler.jsonc`, under `vars`:

| Variable | Value |
| --- | --- |
| `DATA_MODE` | `MULTITENANT` (changed from `MOCK`) |
| `CREDENTIALS_STORE_DRIVER` | `D1` |
| `CACHE_ENABLED` | `TRUE` or `FALSE` |
| `DEVELOPER_NAME`, `SUPPORT_EMAIL`, `SUPPORT_URL`, `SUPPORT_PHONE`, `DEVELOPER_LOGO_FILENAME` | Your own branding, shown in the app shell |

In `.secrets.production` (see `.secrets.production.example`):

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

### Select the D1 Driver

Creating the database isn't enough on its own — the app has three
credentials-store drivers and has to be told to use this one. That takes two
settings, in two different places, because they're read at two different
times:

* `CREDENTIALS_STORE_DRIVER` in `wrangler.jsonc`'s `vars` — read at
  **runtime** by the deployed Worker, and what actually selects the driver.
* `CREDENTIALS_STORE_DRIVER` in `.env.production.local` — read at **build**
  time by `next.config.ts`, which stubs out every driver except the one named
  there. `wrangler.jsonc` can't reach this: its `vars` populate the Worker's
  runtime env, long after `next build` has finished.

Both must be `D1`. Nothing enforces that they agree, and disagreement gives
you a bundle built for one driver and a runtime asking for another. See
`.env.production.local.example` for the copy-and-edit template.

D1 is the only driver that works on Workers. `SQLITE` writes to a local file
the runtime has no persistent equivalent of, and `POSTGRES` pulls in `pg`,
which cannot be bundled for workerd at all.

Note that the driver is only actually exercised in `DATA_MODE=MULTITENANT` —
`MOCK` and `STATIC` never look up a stored credential, so a deploy in either
of those modes will appear healthy whether or not this database exists.

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

