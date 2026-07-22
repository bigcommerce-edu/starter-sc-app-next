import { cache } from "react";
import { MockRestApiClient } from "@/lib/bc-api-client/rest-client/mock-rest-client/mock-rest-client";
import { getDataMode, resolveApiToken, resolveStoreHash } from "@/lib/bc-api-client/resolve-store-credentials";
import { RestApiClient } from "@/lib/bc-api-client/rest-client/rest-client";
import { BcRestApiClient } from "@/lib/bc-api-client/rest-client/types";

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
  if (getDataMode() === "MOCK") {
    return new MockRestApiClient();
  }

  return getCachedRestApiClient(resolveStoreHash(storeHash));
}
