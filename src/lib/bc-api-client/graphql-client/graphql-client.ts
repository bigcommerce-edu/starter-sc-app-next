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
        // No timeout at all for a mutation — see GraphqlRequestOptions'
        // own comment (same reasoning as rest-client.ts's mutate()): a
        // client-side abort doesn't cancel the write on BigCommerce's side,
        // so timing out risks reporting failure for a mutation that
        // actually landed.
        ...(options.isMutation ? {} : { signal: AbortSignal.timeout(API_REQUEST_TIMEOUT_MS) }),
      });
    } catch (error) {
      // fetch itself throws for a network failure (DNS, connection refused)
      // or an AbortSignal.timeout firing — neither has a response to read a
      // status/body from, so this is a distinct failure mode from the
      // non-2xx/malformed-body handling below.
      throw new AppError("UPSTREAM_API", "Could not reach BigCommerce.", { cause: error });
    }

    // BigCommerce's GraphQL Admin API reports validation errors (bad query
    // syntax, a mistyped enum value, etc.) as a non-2xx with the actual
    // detail in the JSON body's `errors` array, not just a bare status —
    // reading only response.status here would discard the one piece of
    // information that explains the failure. But the body isn't guaranteed
    // to be JSON at all: a proxy/gateway failure in front of the API (e.g. a
    // 502 with an HTML error page) has the same shape as a real response
    // (some status, some text), and JSON.parse throwing there would discard
    // response.status — the one thing this error handling exists to
    // preserve — behind a raw, unrelated SyntaxError instead. Falling back
    // to the raw text (truncated, in case it's a large HTML page) keeps that
    // diagnostic intact rather than losing it to a parse failure.
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

      // errorDetail is not shown to end users (callers only see the message
      // below) — it's attached as `cause` purely for logs/debugging, since
      // BigCommerce's own error text is the most useful signal available
      // when a caller needs to diagnose why a request failed.
      throw new AppError("UPSTREAM_API", "A BigCommerce API request failed.", {
        cause: `status ${response.status}: ${errorDetail}`,
      });
    }

    return body?.data as TResult;
  }
}
