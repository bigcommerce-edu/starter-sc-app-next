import { BcGraphqlApiClient, GraphqlRequestOptions, GraphqlResponseBody } from "@/lib/bc-api-client/graphql-client/types";
import { StoreApiCredentials } from "@/lib/bc-api-client/types";
import { API_REQUEST_TIMEOUT_MS } from "@/lib/bc-api-client/request-timeout";
import { AppError } from "@/lib/errors/app-error";

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
    options: GraphqlRequestOptions = {},
  ): Promise<TResult> {
    const { storeHash, apiToken } = this.credentials;

    if (!storeHash || !apiToken) {
      throw new AppError("VALIDATION", "A store hash and API token are required to make a request.");
    }

    const url = `${API_BASE_URL}/stores/${storeHash}/graphql`;

    let response: Response;

    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          "X-Auth-Token": apiToken,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query, variables }),
        // No timeout for a mutation — an aborted client-side request
        // doesn't cancel the write on BigCommerce's side (see rest-client.ts).
        ...(options.isMutation ? {} : { signal: AbortSignal.timeout(API_REQUEST_TIMEOUT_MS) }),
      });
    } catch (error) {
      throw new AppError("UPSTREAM_API", "Could not reach BigCommerce.", { cause: error });
    }

    // TODO: manual testing shows BigCommerce's GraphQL Admin API also
    // returns X-Rate-Limit-* headers, though this isn't documented for
    // GraphQL. Once confirmed as guaranteed (not incidental) behavior, wire
    // in the same throttle rest-client.ts applies:
    // `await throttleOnLowRateLimit(response.headers);`

    // Validation errors arrive as a non-2xx with detail in the body's
    // `errors` array — but the body isn't guaranteed to be JSON (a
    // proxy/gateway failure can return an HTML error page with a real
    // status), so a parse failure falls back to raw text rather than
    // losing the diagnostic to an unrelated SyntaxError.
    const responseText = await response.text();
    let body: GraphqlResponseBody<TResult> | undefined;

    try {
      body = responseText ? (JSON.parse(responseText) as GraphqlResponseBody<TResult>) : undefined;
    } catch {
      body = undefined;
    }

    if (!response.ok || body?.errors?.length) {
      const errorDetail = body?.errors?.length
        ? body.errors.map((error) => error.message).join("; ")
        : responseText.slice(0, 500);

      // errorDetail is attached as `cause` for logs only, never shown to
      // end users.
      throw new AppError("UPSTREAM_API", "A BigCommerce API request failed.", {
        cause: `status ${response.status}: ${errorDetail}`,
      });
    }

    return body?.data as TResult;
  }
}
