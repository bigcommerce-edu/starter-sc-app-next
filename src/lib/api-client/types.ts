export type DataMode = "MOCK" | "STATIC" | "MULTITENANT";

export type ApiRequestParams = Record<string, string | number | boolean | undefined>;

// The standard BigCommerce v3 list-endpoint envelope: a page of records plus
// offset-pagination metadata. v2 endpoints (e.g. gift certificates) instead
// return a bare array and communicate pagination via response headers — see
// lib/gift-certificates/types.ts.
export interface V3Pagination {
  total: number;
  count: number;
  per_page: number;
  current_page: number;
  total_pages: number;
}

export interface V3ListResponse<TItem> {
  data: TItem[];
  meta: {
    pagination: V3Pagination;
  };
}

export interface V3ItemResponse<TItem> {
  data: TItem;
  meta: Record<string, never>;
}

export interface ApiRequestOptions {
  params?: ApiRequestParams;
}

export interface ApiMutationOptions {
  body?: unknown;
}

// v2 list endpoints (e.g. gift certificates) report their total count via
// response headers rather than a body field, so callers that need it have to
// read headers alongside the parsed body — see gift-certificates-api.ts.
export interface ApiResponse<TResponse> {
  data: TResponse;
  headers: Headers;
}

// Modeled on the BigCommerce REST API: every request is a path (e.g.
// "/v2/gift_certificates") plus optional query params, and returns a raw JSON
// body plus response headers. Callers are responsible for shaping the body
// into domain types. post/put/delete are for mutating requests — MockApiClient
// rejects all three, since there's no mock store to mutate (see
// mock-client.ts).
export interface ApiClient {
  get<TResponse>(path: string, options?: ApiRequestOptions): Promise<ApiResponse<TResponse>>;
  post<TResponse>(path: string, options?: ApiMutationOptions): Promise<ApiResponse<TResponse>>;
  put<TResponse>(path: string, options?: ApiMutationOptions): Promise<ApiResponse<TResponse>>;
  delete<TResponse>(path: string, options?: ApiMutationOptions): Promise<ApiResponse<TResponse>>;
}
