// What every non-mock BigCommerce API client (REST, GraphQL, ...) needs to
// make a request: a store to scope the request to, and the token that store
// was issued at install time. Resolved via resolve-store-credentials.ts by
// each getXApiClient (see get-rest-api-client.ts, get-graphql-api-client.ts)
// — nothing outside those getters should need to construct or pass this
// around.
export interface StoreApiCredentials {
  storeHash: string | undefined;
  apiToken: string | undefined;
}
