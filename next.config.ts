import type { NextConfig } from "next";

// Server Actions are rejected as cross-origin unless the request's Origin
// header matches one of these host[:port] entries (no scheme) — see
// https://nextjs.org/docs/app/api-reference/config/next-config-js/serverActions#allowedorigins.
// APP_ORIGIN is the authoritative source (see lib/routing/app-url.ts), but it's
// a full URL there, so it has to be stripped down to just the host for this.
// localhost is also needed alongside it: APP_ORIGIN is only set to the tunnel
// host when developing through devtunnels.ms (see .env.local), but the app
// still needs to work when hit directly on localhost without a tunnel.
const allowedOrigins = ["localhost:3000"];

if (process.env.APP_ORIGIN) {
  allowedOrigins.push(new URL(process.env.APP_ORIGIN).host);
}

// Stubs out the Postgres and D1 credentials-store drivers unless
// CREDENTIALS_STORE_DRIVER actually selects that one. SQLite is never stubbed:
// it depends only on node:sqlite, which bundles anywhere.
function buildCredentialsDriverAliases(): Record<string, string> {
  const configuredDriver = process.env.CREDENTIALS_STORE_DRIVER;
  const aliases: Record<string, string> = {};

  if (configuredDriver !== "POSTGRES") {
    aliases["@/lib/credentials-store/postgres-driver-loader"] =
      "@/lib/credentials-store/postgres-driver-loader.unavailable";
  }

  if (configuredDriver !== "D1") {
    aliases["@/lib/credentials-store/d1-driver-loader"] = "@/lib/credentials-store/d1-driver-loader.unavailable";
  }

  return aliases;
}

const nextConfig: NextConfig = {
  // Cache Components (PPR) is off, and every `use cache` boundary plus its
  // cacheLife/cacheTag calls has been removed alongside it, because the PPR
  // staged-render path corrupts streamed HTML on Cloudflare Workers via
  // @opennextjs/cloudflare: chunks of the RSC flight payload are emitted
  // outside their `<script>` wrapper and render as raw JSON on the page.
  // Reproducible on `wrangler dev --local` and byte-identical on the edge,
  // while plain `next start` (Node) is unaffected — see
  // https://github.com/opennextjs/opennextjs-cloudflare/issues/1225 and
  // https://github.com/opennextjs/opennextjs-cloudflare/pull/1318.
  //
  // Note that dropping only the `remote` qualifier (plain `use cache`) does
  // NOT avoid this: PPR stays enabled and the corruption is unchanged. The
  // flag itself has to be off.
  //
  // Caching itself is NOT gone — it moved down to the fetches the cached
  // components used to wrap, keeping the same two lifetime profiles and the
  // same cache tags. See lib/cache/cache-profiles.ts, and
  // CACHE_ENABLED still switches it on and off. Reconsider
  // component-level caching once #1318 ships.
  cacheComponents: false,
  
  // Swaps each of the two remote credentials-store drivers for a
  // dependency-free stub unless CREDENTIALS_STORE_DRIVER actually selects it
  // — see lib/credentials-store/{postgres,d1}-driver-loader.ts and their
  // .unavailable.ts counterparts.
  //
  // This isn't just an unused-code optimization. Each driver has a
  // dependency that can't be bundled for the *other* driver's deployment
  // target, so leaving both in the graph breaks whichever build it isn't
  // meant for:
  //
  //   - `pg` (Postgres) does an unconditional `require("pg-cloudflare")`
  //     internally that fails to resolve when bundled for Cloudflare Workers
  //     via @opennextjs/cloudflare, even though that branch would never
  //     execute there.
  //   - @opennextjs/cloudflare (D1) is the Workers adapter itself; a Node
  //     host's build has no reason to trace into it for a driver it would
  //     never select.
  //
  // A build-time alias is the only lever that keeps either out of the
  // compiled output entirely, since neither a runtime env check nor a
  // dynamic import stops a bundler from tracing into a statically-reachable
  // module.
  turbopack: {
    resolveAlias: buildCredentialsDriverAliases(),
  },
  // Without this, Next's SWC compiler doesn't apply styled-components'
  // displayNameAndId transform, so every styled(...) component (AppLink,
  // ControlPanelLink, etc.) gets its class name generated purely at
  // runtime — which can come out in a different order on the server's
  // render pass than on the client's first hydration pass, causing a
  // "className didn't match" hydration error. This gives every
  // styled-component a stable, deterministic class name/id instead.
  compiler: {
    styledComponents: true,
  },
  experimental: {
    serverActions: {
      allowedOrigins,
    },
  },
};

export default nextConfig;
