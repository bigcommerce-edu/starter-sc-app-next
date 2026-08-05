import { getDataMode } from "@/lib/bc-api-client/data-mode";

// Re-exported so existing callers that need both DataMode and the
// credential-resolution helpers below don't need a second import — see
// data-mode.ts for why getDataMode itself lives in its own module.
export { getDataMode } from "@/lib/bc-api-client/data-mode";
export type { DataMode } from "@/lib/bc-api-client/data-mode";

// Resolves which store API calls should actually target — not always the
// raw storeHash route param: STATIC mode always talks to the one store
// configured via env vars regardless of the route, MOCK has no real store,
// and MULTITENANT is scoped per-session. Throws if MULTITENANT is missing a
// route param, since that means the route itself is misconfigured.
export function resolveStoreHash(storeHash: string | undefined): string | undefined {
  switch (getDataMode()) {
    case "MOCK":
      return undefined;
    case "STATIC":
      return process.env.STATIC_STORE_HASH;
    case "MULTITENANT":
      if (!storeHash) {
        throw new Error("A store hash is required when DATA_MODE is MULTITENANT.");
      }

      return storeHash;
  }
}

// Resolves the API token for an already-resolved storeHash (never per-user
// — one token per store). Returns undefined rather than throwing when
// missing, so each API client decides for itself that a missing token is an
// error.
//
// Not memoized per request yet — the caching enhancement wraps this in
// cache(). MULTITENANT still throws: no credentials store exists until
// Lab 3.
export async function resolveApiToken(storeHash: string | undefined): Promise<string | undefined> {
  if (getDataMode() === "STATIC") {
    return process.env.STATIC_STORE_TOKEN;
  }

  throw new Error("Not implemented yet.");
}
