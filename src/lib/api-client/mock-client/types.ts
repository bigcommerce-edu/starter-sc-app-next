import { ApiRequestParams } from "@/lib/api-client/types";

// A single mock-able request path. `pattern` is matched against the request
// path; `handle` receives the resulting match (so path segments like an id
// can be pulled from capture groups) plus any query params, and returns the
// mock response body. Grouping a feature's handlers behind one array (see
// gift-certificates' mock/handlers.ts) is what lets MockApiClient stay
// feature-agnostic: it only ever iterates a list, it never names a feature.
export interface MockRouteHandler {
  pattern: RegExp;
  handle(match: RegExpMatchArray, params: ApiRequestParams): unknown;
}
