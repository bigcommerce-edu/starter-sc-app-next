// Shared by both the REST and GraphQL clients so a hung upstream BigCommerce
// request fails fast with a clear error rather than hanging the Server
// Component/Action that awaited it for however long the deployment
// platform's own function timeout happens to be.
export const API_REQUEST_TIMEOUT_MS = 10_000;
