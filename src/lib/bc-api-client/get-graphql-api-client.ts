import { cache } from "react";
import { GraphqlApiClient } from "@/lib/bc-api-client/graphql-client/graphql-client";
import { BcGraphqlApiClient } from "@/lib/bc-api-client/graphql-client/types";
import { getDataMode, resolveApiToken, resolveStoreHash } from "@/lib/bc-api-client/resolve-store-credentials";

// Memoized per request, keyed on the resolved store hash — same rationale
// as getCachedRestApiClient (get-rest-api-client.ts).
const getCachedGraphqlApiClient = cache(async (resolvedStoreHash: string | undefined): Promise<BcGraphqlApiClient> => {
  return new GraphqlApiClient({ storeHash: resolvedStoreHash, apiToken: await resolveApiToken(resolvedStoreHash) });
});

// Selects and configures the BigCommerce Admin GraphQL API client for the
// given store. Mirrors getRestApiClient's shape; has no MOCK-mode
// implementation since nothing built on the GraphQL client needs mocked
// data yet, so MOCK mode just throws on first use.
//
// apiToken is an explicit override for register-app-extension.ts (via
// installStore), which needs the token just returned from the OAuth
// handshake rather than the one persisted via getStoreToken — right after
// exchanging the code, that token may not be written to the credentials
// store yet. Passing it skips resolveApiToken and the shared cache, since
// this client is a one-off for a single mutation.
export async function getGraphqlApiClient(storeHash: string | undefined, apiToken?: string): Promise<BcGraphqlApiClient> {
  if (apiToken !== undefined) {
    return new GraphqlApiClient({ storeHash, apiToken });
  }

  if (getDataMode() === "MOCK") {
    throw new Error("The BigCommerce GraphQL API client has no MOCK-mode implementation.");
  }

  return getCachedGraphqlApiClient(resolveStoreHash(storeHash));
}
