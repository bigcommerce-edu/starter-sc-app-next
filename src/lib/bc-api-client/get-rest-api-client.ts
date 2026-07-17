import { cache } from "react";
import { MockRestApiClient } from "@/lib/bc-api-client/mock-client/mock-client";
import { RestApiClient } from "@/lib/bc-api-client/rest-client/rest-client";
import { BcRestApiClient, DataMode } from "@/lib/bc-api-client/types";
import { getCredentialsStore } from "@/lib/credentials-store/get-credentials-store";

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
// Only called from inside getRestApiClient (see below) — nothing else needs
// to know this resolution happens at all.
//
// Every real MULTITENANT request is scoped to a store, so a missing route
// param in that mode means a route is misconfigured (e.g. a root-level dev
// alias got exposed) rather than something callers should handle
// gracefully — this is the first (and only) place that matters, so it
// throws here rather than requiring every *Page to separately assert it.
function resolveStoreHash(storeHash: string | undefined): string | undefined {
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
// when no token is found lets RestApiClient be the single place that
// decides a missing token is an error, regardless of which mode caused it.
//
// Cached by React's per-request memoization, keyed on storeHash alone
// (never userId — this is also called from inside `use cache` component
// trees via getRestApiClient, which can only ever cross that boundary with
// plain, serializable, session-agnostic arguments). Exported so
// isAuthorizedForStore (see lib/session/is-authorized-for-store.ts) can call
// this exact same wrapped function as half of its authorization check,
// run in parallel with the store_users link check via Promise.all — since
// it's the same cache() entry, the *View components' own later call to
// getRestApiClient for this storeHash reuses this result for free instead
// of triggering a second DB round-trip.
export const resolveApiToken = cache(async (storeHash: string | undefined): Promise<string | undefined> => {
  if (getDataMode() === "STATIC") {
    return process.env.STATIC_STORE_TOKEN;
  }

  if (!storeHash) {
    return undefined;
  }

  return getCredentialsStore().getStoreToken(storeHash);
});

// Cached by React's per-request memoization, keyed on the resolved store
// hash (see resolveStoreHash) rather than the raw route param passed into
// getRestApiClient — e.g. in STATIC mode, every call resolves to the same
// store regardless of the route param it was given, and should share one
// RestApiClient instance per request rather than getting a new one per
// distinct (but ultimately irrelevant) input.
const getCachedRestApiClient = cache(async (resolvedStoreHash: string | undefined): Promise<BcRestApiClient> => {
  return new RestApiClient({ storeHash: resolvedStoreHash, apiToken: await resolveApiToken(resolvedStoreHash) });
});

// Selects and configures the BigCommerce REST API client for the given
// store. Takes storeHash — the [storeHash] route param, or undefined on a
// root-level dev route — and resolves internally which store to actually
// target (see resolveStoreHash), since that isn't always the same thing
// (e.g. STATIC mode always targets its one env-configured store regardless
// of the route). This function itself makes no dynamic reads beyond that
// resolution (in MULTITENANT, this will eventually need a cache-safe
// session lookup), so it's safe to call from inside a `use cache` component
// or function, as long as only storeHash (a plain, serializable string)
// crosses that boundary — the returned client is a class instance and must
// never be passed as an argument into another `use cache` scope.
export async function getRestApiClient(storeHash: string | undefined): Promise<BcRestApiClient> {
  const mode = getDataMode();

  if (mode === "MOCK") {
    return new MockRestApiClient();
  }

  return getCachedRestApiClient(resolveStoreHash(storeHash));
}
