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
