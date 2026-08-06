// TODO: implement GraphqlApiClient, talking to the real BigCommerce Admin
// GraphQL API
//  - constructor takes StoreApiCredentials (storeHash, apiToken), same auth
//    mechanism (X-Auth-Token) and store-scoping as RestApiClient
//  - always POST to https://api.bigcommerce.com/stores/{storeHash}/graphql
//    with { query, variables } as the JSON body
//  - retryOnRateLimit around the fetch; AbortSignal.timeout(API_REQUEST_TIMEOUT_MS)
//    unless options.isMutation (no timeout for a mutation, matching
//    rest-client.ts's own reasoning)
//  - parse the response body as JSON, falling back to raw text on a parse
//    failure (a proxy/gateway failure can return an HTML error page)
//  - throw AppError("UPSTREAM_API", ...) on a non-2xx status OR a non-empty
//    errors array, so callers never have to check for errors themselves
