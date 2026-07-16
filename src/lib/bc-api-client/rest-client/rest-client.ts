import { ApiMutationOptions, ApiRequestOptions, ApiResponse, BcRestApiClient } from "@/lib/bc-api-client/rest-client/types";
import { StoreApiCredentials } from "@/lib/bc-api-client/types";

const API_BASE_URL = "https://api.bigcommerce.com";

function buildUrl(storeHash: string, path: string, params: ApiRequestOptions["params"]): string {
  const url = new URL(`${API_BASE_URL}/stores/${storeHash}${path}`);

  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

// This is also the app's cache-observability signal: a fetch only happens on
// a `use cache` miss (or a mutation, which never goes through `use cache` at
// all), so a logged request means the calling *View's cache entry was
// missing/expired, and no log on a repeat visit means it was served from
// cache. Off by default since it's a developer diagnostic, not something a
// deployed app should log unconditionally. REST-specific (rather than shared
// with the GraphQL client): method + URL + status is a useful signal when
// the URL varies by path and verb, but every GraphQL request is a POST to
// the same "/graphql" URL, so the same log line would carry none of that
// signal — GraphQL request/error insight instead comes from the query name
// and any body-level `errors`, not from method/status.
function isApiRequestLoggingEnabled(): boolean {
  return process.env.LOG_API_REQUESTS?.toLowerCase() === "true";
}

function logApiRequest(method: string, url: string, status: number, durationMs: number): void {
  if (!isApiRequestLoggingEnabled()) {
    return;
  }

  console.log(`[BigCommerce API] ${method} ${url} -> ${status} (${durationMs.toFixed(0)}ms)`);
}

// Talks to the real BigCommerce Admin REST API. Used by both STATIC and
// (eventually) MULTITENANT modes — they differ only in how storeHash/apiToken
// are resolved (see get-rest-api-client.ts), not in how requests are made, so
// this class is agnostic to which mode constructed it.
export class RestApiClient implements BcRestApiClient {
  constructor(private readonly credentials: StoreApiCredentials) {}

  private getCredentialsOrThrow(): { storeHash: string; apiToken: string } {
    const { storeHash, apiToken } = this.credentials;

    if (!storeHash || !apiToken) {
      throw new Error("A store hash and API token are required to make a request.");
    }

    return { storeHash, apiToken };
  }

  async get<TResponse>(path: string, options: ApiRequestOptions = {}): Promise<ApiResponse<TResponse>> {
    const { storeHash, apiToken } = this.getCredentialsOrThrow();
    const url = buildUrl(storeHash, path, options.params);

    const startedAt = performance.now();
    const response = await fetch(url, {
      headers: {
        "X-Auth-Token": apiToken,
        Accept: "application/json",
      },
    });

    logApiRequest("GET", url, response.status, performance.now() - startedAt);

    if (!response.ok) {
      throw new Error(`BigCommerce API request to "${path}" failed with status ${response.status}.`);
    }

    // Some GET endpoints (e.g. v2 gift certificates, when nothing matches the
    // query) respond 204 No Content rather than 200 with an empty array —
    // parsing an empty body as JSON would throw, so only attempt it when
    // there's actually a body. Callers that expect a list should treat a
    // missing/undefined data as empty, the same way they'd treat [].
    const data = response.status === 204 ? undefined : ((await response.json()) as TResponse);

    return { data: data as TResponse, headers: response.headers };
  }

  private async mutate<TResponse>(
    method: "POST" | "PUT" | "DELETE",
    path: string,
    options: ApiMutationOptions = {},
  ): Promise<ApiResponse<TResponse>> {
    const { storeHash, apiToken } = this.getCredentialsOrThrow();
    const url = buildUrl(storeHash, path, undefined);

    const startedAt = performance.now();
    const response = await fetch(url, {
      method,
      headers: {
        "X-Auth-Token": apiToken,
        Accept: "application/json",
        ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });

    logApiRequest(method, url, response.status, performance.now() - startedAt);

    if (!response.ok) {
      throw new Error(`BigCommerce API request to "${path}" failed with status ${response.status}.`);
    }

    // DELETE responses are typically 204 No Content — parsing an empty body
    // as JSON would throw, so only attempt it when there's actually a body.
    const data = response.status === 204 ? undefined : ((await response.json()) as TResponse);

    return { data: data as TResponse, headers: response.headers };
  }

  async post<TResponse>(path: string, options: ApiMutationOptions = {}): Promise<ApiResponse<TResponse>> {
    return this.mutate<TResponse>("POST", path, options);
  }

  async put<TResponse>(path: string, options: ApiMutationOptions = {}): Promise<ApiResponse<TResponse>> {
    return this.mutate<TResponse>("PUT", path, options);
  }

  async delete<TResponse>(path: string, options: ApiMutationOptions = {}): Promise<ApiResponse<TResponse>> {
    return this.mutate<TResponse>("DELETE", path, options);
  }
}
