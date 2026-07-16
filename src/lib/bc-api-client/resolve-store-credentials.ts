import { getCredentialsStore } from "@/lib/credentials-store/get-credentials-store";

export type DataMode = "MOCK" | "STATIC" | "MULTITENANT";

const VALID_DATA_MODES: DataMode[] = ["MOCK", "STATIC", "MULTITENANT"];

export function getDataMode(): DataMode {
  const configuredMode = process.env.DATA_MODE?.toUpperCase();

  return VALID_DATA_MODES.includes(configuredMode as DataMode) ? (configuredMode as DataMode) : "MOCK";
}

// Resolves which store API calls should actually target, which is NOT
// always storeHash (the route param — every *Page/*View/data-access function
// calls it storeHash, but it's really just whatever the [storeHash] URL
// segment happened to contain, or undefined on a root-level dev route):
// STATIC mode always talks to the one store configured via env vars
// regardless of that route param, and MULTITENANT resolves per-session.
//
// Every real MULTITENANT request is scoped to a store, so a missing route
// param in that mode means a route is misconfigured (e.g. a root-level dev
// alias got exposed) rather than something callers should handle
// gracefully — this is the first (and only) place that matters, so it
// throws here rather than requiring every *Page to separately assert it.
//
// Shared by every non-mock BigCommerce API client (REST, GraphQL, ...) — mode
// resolution is identical regardless of which API ends up making the
// request. Each getXApiClient calls this (and resolveApiToken below)
// separately, rather than through one combined helper, so it can key its
// per-request cache() on this primitive string: React's cache() memoizes
// non-primitive args by reference, so caching on a freshly-built credentials
// object would silently defeat memoization.
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

// A BigCommerce API token is generated once for a store at install time and
// stored server-side — it is never per-user. Resolves the token for an
// already-resolved storeHash (see resolveStoreHash) — STATIC mode reads it
// from env vars; MULTITENANT looks it up via the credentials store, which
// was populated by the /auth install callback (see
// app/api/app/auth/route.ts). Returning undefined (rather than throwing)
// when no token is found lets each API client be the single place that
// decides a missing token is an error, regardless of which mode caused it.
// Takes an already-resolved storeHash (see resolveStoreHash) — not the raw
// route param.
export async function resolveApiToken(storeHash: string | undefined): Promise<string | undefined> {
  if (getDataMode() === "STATIC") {
    return process.env.STATIC_STORE_TOKEN;
  }

  if (!storeHash) {
    return undefined;
  }

  return getCredentialsStore().getStoreToken(storeHash);
}
