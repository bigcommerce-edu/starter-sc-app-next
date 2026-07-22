// Indirection point between get-credentials-store.ts and the real Postgres
// driver — get-credentials-store.ts imports PostgresCredentialsStore from
// here, never directly from postgres-driver/postgres-credentials-store.ts.
// This is the module next.config.ts's turbopack.resolveAlias swaps for
// postgres-driver-loader.unavailable.ts when CREDENTIALS_STORE_DRIVER isn't
// "POSTGRES" — see that file's own comment for why: some deployment targets
// (e.g. Cloudflare Workers via @opennextjs/cloudflare) fail to bundle `pg`
// at all (it does an unconditional `require("pg-cloudflare")` internally
// that can't resolve there), so this driver needs to be physically absent
// from the compiled output on those targets, not just unused at runtime — an
// alias only has something to redirect if there's a single, stable import
// specifier every build goes through, which is what this file exists to be.
export { PostgresCredentialsStore } from "@/lib/credentials-store/postgres-driver/postgres-credentials-store";
