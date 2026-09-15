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
// CREDENTIALS_STORE_DRIVER selects that one. Each pulls in a dependency that
// can't be bundled for the other's target (`pg` for Postgres,
// @opennextjs/cloudflare for D1), and a build-time alias is the only thing
// that keeps it out of the output — a runtime env check doesn't stop a bundler
// tracing into a reachable module. SQLite needs no stub; node:sqlite bundles
// anywhere.
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
  // Composable caching not used with Cloudflare Workers
  cacheComponents: false,
  
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
