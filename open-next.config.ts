import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
import d1NextTagCache from "@opennextjs/cloudflare/overrides/tag-cache/d1-next-tag-cache";
import doQueue from "@opennextjs/cloudflare/overrides/queue/do-queue";
import { purgeCache } from "@opennextjs/cloudflare/overrides/cache-purge/index";

// Activates the Cloudflare cache infrastructure declared in wrangler.jsonc.
// Each override reads its binding by name; an override omitted here defaults
// to a no-op, leaving its binding inert.
export default defineCloudflareConfig({
  // Stores the cached payloads themselves in R2 (NEXT_INC_CACHE_R2_BUCKET).
  incrementalCache: r2IncrementalCache,

  // Tag-to-revalidation-timestamp map in D1 (NEXT_TAG_CACHE_D1). Without it,
  // entries only expire on their own lifetime and revalidateTag() can't
  // invalidate them early.
  tagCache: d1NextTagCache,

  // Revalidations through the DOQueueHandler Durable Object
  // (NEXT_CACHE_DO_QUEUE) rather than inline, so a burst of requests for one
  // stale route triggers a single revalidation. Depends on the
  // WORKER_SELF_REFERENCE binding, which the DO calls back through.
  queue: doQueue,

  // Edge CDN purges on path invalidation, buffered through the
  // BucketCachePurge Durable Object (NEXT_CACHE_DO_PURGE).
  //
  // No-op unless CACHE_PURGE_ZONE_ID and CACHE_PURGE_API_TOKEN are set, since
  // the zone purge API needs a custom domain — on *.workers.dev it logs a skip
  // and returns. The other layers are unaffected.
  cachePurge: purgeCache({ type: "durableObject" }),
});
