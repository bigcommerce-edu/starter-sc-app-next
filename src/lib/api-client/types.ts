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

export interface ApiRequestOptions {
  params?: ApiRequestParams;
}

// Modeled on the BigCommerce REST API: every request is a path (e.g.
// "/v2/gift_certificates") plus optional query params, and returns a raw JSON
// body. Callers are responsible for shaping that body into domain types.
export interface ApiClient {
  get<TResponse>(path: string, options?: ApiRequestOptions): Promise<TResponse>;
}
