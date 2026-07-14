import { DataMode } from "@/lib/api-client/types";

// Every real MULTITENANT request is scoped to a store, so a missing storeHash
// in that mode means a route is misconfigured (e.g. a root-level dev alias
// got exposed) rather than something callers should handle gracefully.
// Call this once, server-side, wherever both values are known — everything
// downstream (client components, getAppUrl) can then treat storeHash as
// "present when it matters" without checking DataMode itself.
export function assertStoreHashForDataMode(dataMode: DataMode, storeHash: string | undefined): void {
  if (dataMode === "MULTITENANT" && !storeHash) {
    throw new Error("A store hash is required when DATA_MODE is MULTITENANT.");
  }
}
