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

const nextConfig: NextConfig = {
  // Disabled: cacheComponents (PPR) + "use cache: remote" causes intermittent
  // request hangs on Cloudflare Workers via @opennextjs/cloudflare — see
  // https://github.com/opennextjs/opennextjs-cloudflare/issues/1115. Every
  // `"use cache: remote"`, `cacheTag(...)`, and `updateTag(...)` call site
  // in this app is commented out alongside this flag; re-enable together
  // once upstream fixes the streaming/hang issue.
  // cacheComponents: true,
  
  // Swaps the Postgres credentials-store driver for a `pg`-free stub
  // whenever CREDENTIALS_STORE_DRIVER isn't "POSTGRES" — see
  // lib/credentials-store/postgres-driver-loader.ts and
  // postgres-driver-loader.unavailable.ts. This isn't just an unused-code
  // optimization: `pg` does an unconditional `require("pg-cloudflare")`
  // internally that fails to resolve when bundled for some deployment
  // targets (e.g. Cloudflare Workers via @opennextjs/cloudflare), even
  // though that branch would never actually execute there — a build-time
  // alias is the only lever that keeps `pg` out of the compiled output
  // entirely, since neither a runtime env check nor a dynamic import stops
  // a bundler from tracing into a statically-reachable module.
  turbopack: {
    resolveAlias:
      process.env.CREDENTIALS_STORE_DRIVER !== "POSTGRES"
        ? {
            "@/lib/credentials-store/postgres-driver-loader":
              "@/lib/credentials-store/postgres-driver-loader.unavailable",
          }
        : {},
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
  // cacheLife: {
  //   // This is an admin-privileged app, so most fetches use a short lifetime —
  //   // changes made directly in the BigCommerce control panel, or by another
  //   // admin, shouldn't stay stale for long even where no cache tag invalidates
  //   // them.
  //   standard: { stale: 300, revalidate: 300, expire: 300 },
  //   // Channels change far less often than gift certificates or customers
  //   // (they're a store configuration concern, not day-to-day transactional
  //   // data), so this can tolerate a much longer lifetime.
  //   extended: { stale: 600, revalidate: 600, expire: 600 },
  // },
};

export default nextConfig;
