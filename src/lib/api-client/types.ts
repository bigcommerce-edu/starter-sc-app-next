export type DataMode = "MOCK" | "STATIC" | "MULTITENANT";

export type ApiRequestParams = Record<string, string | number | boolean | undefined>;

export interface ApiRequestOptions {
  params?: ApiRequestParams;
}

// Modeled on the BigCommerce REST API: every request is a path (e.g.
// "/v2/gift_certificates") plus optional query params, and returns a raw JSON
// body. Callers are responsible for shaping that body into domain types.
export interface ApiClient {
  get<TResponse>(path: string, options?: ApiRequestOptions): Promise<TResponse>;
}
