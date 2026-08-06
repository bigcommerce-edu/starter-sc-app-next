// Indirection point between get-credentials-store.ts and the real Postgres
// driver — get-credentials-store.ts imports from here, never directly from
// postgres-driver/postgres-credentials-store.ts. next.config.ts's
// turbopack.resolveAlias swaps this specifier for
// postgres-driver-loader.unavailable.ts whenever CREDENTIALS_STORE_DRIVER
// isn't "POSTGRES", since `pg` fails to bundle on some deployment targets
// (e.g. Cloudflare Workers). An alias needs one stable specifier to
// redirect, which is what this file exists to be.
export { PostgresCredentialsStore } from "@/lib/credentials-store/postgres-driver/postgres-credentials-store";
