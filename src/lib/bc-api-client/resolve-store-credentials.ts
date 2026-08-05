export { getDataMode } from "@/lib/bc-api-client/data-mode";
export type { DataMode } from "@/lib/bc-api-client/data-mode";

export function resolveStoreHash(storeHash: string | undefined): string | undefined {
  // TODO: Implement resolveStoreHash for all 3 modes
  //  - MOCK has no real store (return undefined)
  //  - STATIC always targets the one store configured via STATIC_STORE_HASH
  //  - MULTITENANT uses the given storeHash, throwing if it's missing
  throw new Error("Not implemented yet.");
}

export async function resolveApiToken(storeHash: string | undefined): Promise<string | undefined> {
  // TODO: Implement resolveApiToken's STATIC branch
  //  - STATIC returns STATIC_STORE_TOKEN
  //  - MULTITENANT still throws "Not implemented yet." - no credentials store
  //    exists until Lab 3
  throw new Error("Not implemented yet.");
}
