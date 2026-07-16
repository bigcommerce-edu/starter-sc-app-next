// The BigCommerce Admin GraphQL API's error shape: unlike REST, a failed
// query/mutation can still come back as HTTP 200 with an `errors` array
// alongside (or instead of) `data`. GraphqlApiClient treats a non-empty
// `errors` array as a thrown error the same way BcRestApiClient treats a
// non-2xx status, so callers of BcGraphqlApiClient.request never have to
// check for `errors` themselves.
export interface GraphqlError {
  message: string;
  path?: Array<string | number>;
  extensions?: Record<string, unknown>;
}

export interface GraphqlResponseBody<TResult> {
  data?: TResult;
  errors?: GraphqlError[];
}

// Modeled on the BigCommerce Admin GraphQL API: every request is a single
// query/mutation document plus variables, sent to one endpoint, and
// returns just the unwrapped `data` (request() throws on transport failure,
// non-2xx, or a populated `errors` array — see GraphqlApiClient). Kept as
// its own interface rather than folded into BcRestApiClient since GraphQL's
// request shape (one endpoint, always POST, errors-in-200-body) doesn't map
// onto REST's path/verb model.
export interface BcGraphqlApiClient {
  request<TResult, TVariables extends Record<string, unknown> = Record<string, unknown>>(
    query: string,
    variables?: TVariables,
  ): Promise<TResult>;
}
