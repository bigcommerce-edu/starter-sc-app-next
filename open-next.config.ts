import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
import d1NextTagCache from "@opennextjs/cloudflare/overrides/tag-cache/d1-next-tag-cache";
import doQueue from "@opennextjs/cloudflare/overrides/queue/do-queue";
import { purgeCache } from "@opennextjs/cloudflare/overrides/cache-purge/index";

// Wires the Next.js cache to the Cloudflare infrastructure declared in
// wrangler.jsonc. Each override below reads its own binding by name, so the
// binding names in that file are load-bearing — see the comments there.
//
// Every override defaults to "dummy" (a no-op) when omitted, which is why
// declaring the bindings alone changed no behavior until this file referenced
// them.
export default defineCloudflareConfig({
  // Stores the cached payloads themselves in R2 (NEXT_INC_CACHE_R2_BUCKET).
  incrementalCache: r2IncrementalCache,

  // Maps cache tags to revalidation timestamps in D1 (NEXT_TAG_CACHE_D1),
  // which is what makes on-demand revalidateTag() work. Without this, cached
  // entries only expire on their own lifetime and nothing can invalidate them
  // early.
  //
  // The `revalidations` table is created for you by the populate-cache step of
  // `opennextjs-cloudflare deploy`/`preview`.
  tagCache: d1NextTagCache,

  // Routes ISR/SWR revalidations through the DOQueueHandler Durable Object
  // (NEXT_CACHE_DO_QUEUE) instead of revalidating inline. The queue
  // deduplicates concurrent requests for the same stale route, so a traffic
  // burst triggers one revalidation rather than one per request.
  //
  // This is the override that depends on the WORKER_SELF_REFERENCE service
  // binding: the DO calls back into this Worker to perform the revalidation.
  queue: doQueue,

  // Purges Cloudflare's edge CDN cache when paths are invalidated, buffering
  // the calls through the BucketCachePurge Durable Object
  // (NEXT_CACHE_DO_PURGE) so many tag invalidations collapse into fewer purge
  // API calls.
  //
  // NOTE: this layer is a no-op unless CACHE_PURGE_ZONE_ID and
  // CACHE_PURGE_API_TOKEN are set — it ultimately calls the Cloudflare zone
  // purge API, which requires a custom domain on a zone you control. On a
  // plain *.workers.dev deploy it logs "No cache zone ID or API token
  // provided. Skipping cache purge." and returns. The R2/D1/queue layers above
  // are unaffected and work without a zone; only edge-CDN purging is skipped.
  cachePurge: purgeCache({ type: "durableObject" }),
});
