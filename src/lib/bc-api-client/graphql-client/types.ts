// TODO: Implement BcGraphqlApiClient - define the GraphQL client's request/response shapes
//  - GraphqlError: { message, path?, extensions? } - the BigCommerce Admin
//    GraphQL API's error shape; unlike REST, a failed query/mutation can
//    still come back as HTTP 200 with an errors array alongside (or instead
//    of) data
//  - GraphqlResponseBody<TResult>: { data?: TResult, errors?: GraphqlError[] }
//  - GraphqlRequestOptions: { isMutation?: boolean } - GraphQL has no
//    REST-style verb to distinguish a read from a write, so the caller has
//    to say so explicitly; defaults to false (a timeout applies)
//  - BcGraphqlApiClient: { request<TResult, TVariables>(query, variables?,
//    options?): Promise<TResult> } - one query/mutation document plus
//    variables, sent to one endpoint, returning just the unwrapped data
