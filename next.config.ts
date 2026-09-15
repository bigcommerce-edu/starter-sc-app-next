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

// Stubs out every credentials-store driver except the one
// CREDENTIALS_STORE_DRIVER selects, by aliasing its *-driver-loader specifier
// to the .unavailable.ts counterpart (see lib/credentials-store/).
//
// This isn't just an unused-code optimization. A driver can carry a dependency
// that fails to bundle for a deployment target it would never run on — `pg`,
// for instance, does an unconditional `require("pg-cloudflare")` internally
// that fails to resolve on some targets even though that branch would never
// execute. A build-time alias is the only lever that keeps such a dependency
// out of the compiled output entirely, since neither a runtime env check nor a
// dynamic import stops a bundler from tracing into a statically-reachable
// module.
//
// SQLite needs no stub: node:sqlite bundles anywhere.
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
  // Cache Components (PPR). The lifetime profiles each `use cache` boundary
  // selects, and the CACHE_ENABLED switch that turns caching on and off, live
  // in lib/cache/cache-profiles.ts rather than in a `cacheLife` block
  // here — cacheLife accepts an inline profile object, so keeping them in one
  // module avoids splitting the caching configuration across two places.
  cacheComponents: true,
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
