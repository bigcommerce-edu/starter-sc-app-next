// TODO: Re-export PostgresCredentialsStore from postgres-driver/
//  - This is the indirection point get-credentials-store.ts imports from,
//    never the real driver directly - next.config.ts's
//    turbopack.resolveAlias swaps this specifier for
//    postgres-driver-loader.unavailable.ts whenever CREDENTIALS_STORE_DRIVER
//    isn't "POSTGRES"
export { PostgresCredentialsStore } from "@/lib/credentials-store/postgres-driver/postgres-credentials-store";
