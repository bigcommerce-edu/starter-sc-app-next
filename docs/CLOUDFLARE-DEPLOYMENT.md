# Deploying to Cloudflare

This guide covers deploying this app to Cloudflare Workers as a hosted
BigCommerce single-click app, using `@opennextjs/cloudflare` to adapt the
Next.js build for the Workers runtime.

This document currently covers only the **cache infrastructure** — the R2
bucket, the cache-tag D1 database, and the Durable Objects that back
revalidation. The credentials-store database (D1) and the full
register-and-install walkthrough are not covered yet.

## Supported Cache Infrastructure

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

The cache-tag D1 database is deliberately **separate** from the app's
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

## 1. Create the R2 Bucket

This bucket holds the incremental cache payloads. The name must match the
`bucket_name` under the `NEXT_INC_CACHE_R2_BUCKET` binding in
`wrangler.jsonc`:

```shell
pnpm wrangler r2 bucket create starter-sc-app-next-cache
```

Verify it exists:

```shell
pnpm wrangler r2 bucket list
```

If you choose a different bucket name, update `wrangler.jsonc` to match. The
*binding* name (`NEXT_INC_CACHE_R2_BUCKET`) must not change — OpenNext looks
that up by name.

## 2. Create the Cache Tag D1 Database

This is the separate cache-tag database described above — not the app's own
data:

```shell
pnpm wrangler d1 create starter-sc-app-next-cache-tags
```

The command prints a `database_id`. Copy it into `wrangler.jsonc`, replacing
the `REPLACE_WITH_D1_DATABASE_ID` placeholder under the
`NEXT_TAG_CACHE_D1` binding. The config will not deploy until you do.

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
pnpm wrangler d1 execute starter-sc-app-next-cache-tags --remote \
  --command "SELECT * FROM revalidations LIMIT 10;"
```

## 3. Durable Objects Need No Provisioning Step

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

## 4. The Cache Overrides

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

## 5. Verify

Once the resources exist and `wrangler.jsonc` has the real `database_id`,
check that the config itself is valid:

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

## Reference

* [OpenNext Cloudflare caching docs](https://opennext.js.org/cloudflare/caching)
* [Cloudflare R2 documentation](https://developers.cloudflare.com/r2/)
* [Cloudflare D1 documentation](https://developers.cloudflare.com/d1/)
* [Durable Objects documentation](https://developers.cloudflare.com/durable-objects/)
