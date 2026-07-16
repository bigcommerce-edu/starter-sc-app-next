import { BcGraphqlApiClient, GraphqlResponseBody } from "@/lib/bc-api-client/graphql-client/types";
import { StoreApiCredentials } from "@/lib/bc-api-client/types";

const API_BASE_URL = "https://api.bigcommerce.com";

// Talks to the real BigCommerce Admin GraphQL API. Same auth mechanism
// (X-Auth-Token) and store-scoping as RestApiClient, but GraphQL's request
// shape doesn't map onto REST's path/verb model — there's exactly one
// endpoint, always POST, and errors can arrive inside a 200 response body
// (see GraphqlResponseBody) — so this is its own class rather than another
// method on RestApiClient.
export class GraphqlApiClient implements BcGraphqlApiClient {
  constructor(private readonly credentials: StoreApiCredentials) {}

  async request<TResult, TVariables extends Record<string, unknown> = Record<string, unknown>>(
    query: string,
    variables?: TVariables,
  ): Promise<TResult> {
    const { storeHash, apiToken } = this.credentials;

    if (!storeHash || !apiToken) {
      throw new Error("A store hash and API token are required to make a request.");
    }

    const url = `${API_BASE_URL}/stores/${storeHash}/graphql`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "X-Auth-Token": apiToken,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, variables }),
    });

    // BigCommerce's GraphQL Admin API reports validation errors (bad query
    // syntax, a mistyped enum value, etc.) as a non-2xx with the actual
    // detail in the JSON body's `errors` array, not just a bare status —
    // reading only response.status here would discard the one piece of
    // information that explains the failure.
    const responseText = await response.text();
    const body = responseText ? (JSON.parse(responseText) as GraphqlResponseBody<TResult>) : undefined;

    if (!response.ok || body?.errors?.length) {
      const errorDetail = body?.errors?.length ? body.errors.map((error) => error.message).join("; ") : responseText;

      throw new Error(`BigCommerce GraphQL request failed with status ${response.status}: ${errorDetail}`);
    }

    return body?.data as TResult;
  }
}
