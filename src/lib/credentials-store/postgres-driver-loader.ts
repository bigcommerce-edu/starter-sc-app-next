// Indirection point between get-credentials-store.ts and the real Postgres
// driver — get-credentials-store.ts imports from here, never directly from
// postgres-driver/postgres-credentials-store.ts. next.config.ts's
// turbopack.resolveAlias swaps this specifier for
// postgres-driver-loader.unavailable.ts whenever CREDENTIALS_STORE_DRIVER
// isn't "POSTGRES". An alias needs one stable specifier to redirect, which is
// what this file exists to be.
//
// The dependency being kept out is `pg`, which cannot be bundled for the
// Cloudflare Workers runtime: pg/lib/stream.js reaches `pg-cloudflare` through
// a bare require(), and that package is one of `pg`'s optionalDependencies, so
// it usually isn't installed. See next.config.ts for why an alias, rather than
// a runtime check, is what excludes it.
export { PostgresCredentialsStore } from "@/lib/credentials-store/postgres-driver/postgres-credentials-store";
