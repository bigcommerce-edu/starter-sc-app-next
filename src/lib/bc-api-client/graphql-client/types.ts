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

// GraphQL has no REST-style verb to distinguish a read from a write the way
// RestApiClient.get vs. post/put/delete can — every request is a POST to the
// same endpoint, whether it's a query or a mutation — so the caller has to
// say so explicitly. isMutation defaults to false (a timeout applies) so a
// caller that forgets this opts into the safer read-like behavior rather
// than silently getting the no-timeout mutation behavior; every real
// mutation call site must pass isMutation: true deliberately. See
// GraphqlApiClient.request and rest-client.ts's mutate() for why a mutation
// gets no client-side timeout at all: aborting only stops us from waiting,
// it doesn't cancel the write on BigCommerce's side, so timing out a
// mutation risks reporting failure for a write that actually succeeded.
export interface GraphqlRequestOptions {
  isMutation?: boolean;
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
    options?: GraphqlRequestOptions,
  ): Promise<TResult>;
}
