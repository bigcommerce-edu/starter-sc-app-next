// Stable specifier for next.config.ts's turbopack.resolveAlias to redirect:
// it swaps this for d1-driver-loader.unavailable.ts whenever
// CREDENTIALS_STORE_DRIVER isn't "D1", keeping @opennextjs/cloudflare out of
// builds for other targets. get-credentials-store.ts imports from here rather
// than from the driver directly.
export { D1CredentialsStore } from "@/lib/credentials-store/d1-driver/d1-credentials-store";
