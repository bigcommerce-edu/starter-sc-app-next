// Indirection point between get-credentials-store.ts and the real D1 driver
// — get-credentials-store.ts imports from here, never directly from
// d1-driver/d1-credentials-store.ts. next.config.ts's
// turbopack.resolveAlias swaps this specifier for
// d1-driver-loader.unavailable.ts whenever CREDENTIALS_STORE_DRIVER isn't
// "D1". An alias needs one stable specifier to redirect, which is what this
// file exists to be.
//
// The reason mirrors the Postgres loader's, with the dependency reversed:
// the D1 driver reaches getCloudflareContext() from @opennextjs/cloudflare,
// which is meaningful only in a Workers build. Keeping it out of the graph
// for other targets means a Vercel/Node build never traces into the
// Cloudflare adapter for a driver it would never select.
export { D1CredentialsStore } from "@/lib/credentials-store/d1-driver/d1-credentials-store";
