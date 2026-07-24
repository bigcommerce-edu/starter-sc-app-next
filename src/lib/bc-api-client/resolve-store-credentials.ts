import { getCredentialsStore } from "@/lib/credentials-store/get-credentials-store";
import { cache } from "react";

export type DataMode = "MOCK" | "STATIC" | "MULTITENANT";

const VALID_DATA_MODES: DataMode[] = ["MOCK", "STATIC", "MULTITENANT"];

export function getDataMode(): DataMode {
  const configuredMode = process.env.DATA_MODE?.toUpperCase();

  return VALID_DATA_MODES.includes(configuredMode as DataMode) ? (configuredMode as DataMode) : "MOCK";
}

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
// error. Memoized per request, keyed on storeHash alone — exported so
// isAuthorizedForStore can call this same cache() entry as part of its own
// check, reusing the result rather than triggering a second DB round-trip.
export const resolveApiToken = cache(async (storeHash: string | undefined): Promise<string | undefined> => {
  if (getDataMode() === "STATIC") {
    return process.env.STATIC_STORE_TOKEN;
  }

  if (!storeHash) {
    return undefined;
  }

  return getCredentialsStore().getStoreToken(storeHash);
});
