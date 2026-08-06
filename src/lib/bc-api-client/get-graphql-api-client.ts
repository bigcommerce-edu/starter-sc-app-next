// TODO: Implement getGraphqlApiClient - select and configure the GraphQL client, mirroring
// get-rest-api-client.ts's shape
//  - memoize the resolved-storeHash-only path with cache(), same rationale
//    as getCachedRestApiClient
//  - an explicit apiToken parameter overrides resolution entirely, for
//    register-app-extension.ts's installStore caller, whose token may not
//    be persisted to the credentials store yet - skip resolveApiToken and
//    the shared cache when it's passed
//  - MOCK mode throws on first use - nothing built on the GraphQL client
//    needs mocked data yet
