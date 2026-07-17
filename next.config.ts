import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  cacheLife: {
    // This is an admin-privileged app, so most fetches use a short lifetime —
    // changes made directly in the BigCommerce control panel, or by another
    // admin, shouldn't stay stale for long even where no cache tag invalidates
    // them.
    standard: { stale: 30, revalidate: 30, expire: 30 },
    // Channels change far less often than gift certificates or customers
    // (they're a store configuration concern, not day-to-day transactional
    // data), so this can tolerate a much longer lifetime.
    extended: { stale: 300, revalidate: 300, expire: 300 },
  },
};

export default nextConfig;
