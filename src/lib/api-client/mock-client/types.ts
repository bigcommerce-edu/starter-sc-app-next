import { ApiRequestParams } from "@/lib/api-client/types";

// headers is for handlers mimicking a v2 endpoint's header-based pagination
// (see gift-certificates-list-handler.ts) — most handlers omit it, since
// v3 endpoints report pagination in the body instead.
export interface MockRouteResponse {
  data: unknown;
  headers?: HeadersInit;
}

// A single mock-able request path. `pattern` is matched against the request
// path; `handle` receives the resulting match (so path segments like an id
// can be pulled from capture groups) plus any query params, and returns the
// mock response. Grouping a feature's handlers behind one array (see
// gift-certificates' mock/handlers.ts) is what lets MockApiClient stay
// feature-agnostic: it only ever iterates a list, it never names a feature.
export interface MockRouteHandler {
  pattern: RegExp;
  handle(match: RegExpMatchArray, params: ApiRequestParams): MockRouteResponse;
}
