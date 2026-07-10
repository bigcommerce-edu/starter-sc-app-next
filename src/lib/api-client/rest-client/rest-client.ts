import { ApiClient, ApiMutationOptions, ApiRequestOptions, ApiResponse, StoreApiCredentials } from "@/lib/api-client/types";

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

// Talks to the real BigCommerce Admin REST API. Used by both STATIC and
// (eventually) MULTITENANT modes — they differ only in how storeHash/apiToken
// are resolved (see get-api-client.ts), not in how requests are made, so
// this class is agnostic to which mode constructed it.
export class RestApiClient implements ApiClient {
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

    const response = await fetch(buildUrl(storeHash, path, options.params), {
      headers: {
        "X-Auth-Token": apiToken,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`BigCommerce API request to "${path}" failed with status ${response.status}.`);
    }

    return { data: (await response.json()) as TResponse, headers: response.headers };
  }

  private async mutate<TResponse>(
    method: "POST" | "PUT" | "DELETE",
    path: string,
    options: ApiMutationOptions = {},
  ): Promise<ApiResponse<TResponse>> {
    const { storeHash, apiToken } = this.getCredentialsOrThrow();

    const response = await fetch(buildUrl(storeHash, path, undefined), {
      method,
      headers: {
        "X-Auth-Token": apiToken,
        Accept: "application/json",
        ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });

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
