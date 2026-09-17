# Deploying to Cloudflare

This guide covers deploying this app to Cloudflare Workers as a hosted
BigCommerce single-click app, using `@opennextjs/cloudflare` to adapt the
Next.js build for the Workers runtime.

Cloudflare support is opt-in: a scaffolding script adds the tooling and
switches the app to the caching implementation Workers can run. This document
starts with that script, then covers the **storage and cache infrastructure**
it expects you to create — the R2 bucket, the cache-tag D1 database, the
Durable Objects that back revalidation, and the D1 database backing the
credentials store. The full register-and-install walkthrough is not covered
yet.

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

## 2. Create the R2 Bucket

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

## 3. Create the Cache Tag D1 Database

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

### The Schema Is Created for You

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

## 4. Create the Credentials Store D1 Database

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

### Apply the Schema Migrations

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

## 5. Durable Objects Need No Provisioning Step

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

## 6. The Cache Overrides

Creating the resources and declaring the bindings is not enough on its own —
`open-next.config.ts` is what activates them. Every override defaults to
`"dummy"` (a no-op) when omitted, so an unreferenced binding changes nothing.

That file is now wired up with four overrides:

* `incrementalCache: r2IncrementalCache` — payloads to R2.
* `tagCache: d1NextTagCache` — tag revalidation timestamps to D1.
* `queue: doQueue` — revalidations through the `DOQueueHandler` Durable Object.
* `cachePurge: purgeCache({ type: "durableObject" })` — edge CDN purges
  buffered through `BucketCachePurge`.

### Cache Purging Needs a Zone

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

## 7. Verify

Once the resources exist and every placeholder in `wrangler.jsonc` is filled
in, check that the config itself is valid:

```shell
pnpm cf-typegen
```

That regenerates `cloudflare-env.d.ts` and will fail on a malformed config. The
new bindings should appear in the generated `CloudflareEnv` interface.

Then build and preview locally against the Workers runtime:

```shell
pnpm preview
```

Deploying uploads secrets, builds, and deploys in one step:

```shell
pnpm deploy
```

Both scripts apply the credentials-store migrations first — `pnpm preview`
against the local database, `pnpm deploy` against the remote one — so a new
migration ships with the deploy that needs it.

## Reference

* [CACHE-IMPLEMENTATION-SWAP.md](./CACHE-IMPLEMENTATION-SWAP.md) — how the
  caching implementation is switched, and what to maintain afterwards
* [OpenNext Cloudflare caching docs](https://opennext.js.org/cloudflare/caching)
* [Cloudflare R2 documentation](https://developers.cloudflare.com/r2/)
* [Cloudflare D1 documentation](https://developers.cloudflare.com/d1/)
* [D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/)
* [Durable Objects documentation](https://developers.cloudflare.com/durable-objects/)
