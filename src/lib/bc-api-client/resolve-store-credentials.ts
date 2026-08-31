export { getDataMode } from "@/lib/bc-api-client/data-mode";
export type { DataMode } from "@/lib/bc-api-client/data-mode";

// TODO: Add storeHash param and return type
export function resolveStoreHash(): void {
  // TODO: Implement resolveStoreHash for all 3 modes
  //  - MOCK has no real store (return undefined)
  //  - STATIC always targets the one store configured via STATIC_STORE_HASH
  //  - MULTITENANT uses the given storeHash, throwing if it's missing
  throw new Error("Not implemented yet.");
}

// TODO: Add storeHash param and return type
export function resolveApiToken(): void {
  // TODO: Implement resolveApiToken's STATIC branch
  //  - STATIC returns STATIC_STORE_TOKEN
  //  - MULTITENANT still throws "Not implemented yet." - no credentials store
  //    exists until Lab 3
  throw new Error("Not implemented yet.");
}
