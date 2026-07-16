import { cache } from "react";
import { GraphqlApiClient } from "@/lib/bc-api-client/graphql-client/graphql-client";
import { BcGraphqlApiClient } from "@/lib/bc-api-client/graphql-client/types";
import { getDataMode, resolveApiToken, resolveStoreHash } from "@/lib/bc-api-client/resolve-store-credentials";

// Cached by React's per-request memoization, keyed on the resolved store
// hash (see resolveStoreHash) — same rationale as getCachedRestApiClient in
// get-rest-api-client.ts.
const getCachedGraphqlApiClient = cache(async (resolvedStoreHash: string | undefined): Promise<BcGraphqlApiClient> => {
  return new GraphqlApiClient({ storeHash: resolvedStoreHash, apiToken: await resolveApiToken(resolvedStoreHash) });
});

// Selects and configures the BigCommerce Admin GraphQL API client for the
// given store. Mirrors getRestApiClient's shape (see get-rest-api-client.ts)
// for consistent ergonomics between the two clients, but has no MOCK-mode
// implementation of its own: nothing built on top of the GraphQL client
// needs mocked data yet, so MOCK mode just throws on first use rather than
// maintaining a mock client with no handlers.
export async function getGraphqlApiClient(storeHash: string | undefined): Promise<BcGraphqlApiClient> {
  if (getDataMode() === "MOCK") {
    throw new Error("The BigCommerce GraphQL API client has no MOCK-mode implementation.");
  }

  return getCachedGraphqlApiClient(resolveStoreHash(storeHash));
}
