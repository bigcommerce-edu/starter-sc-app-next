import { ApiClient, ApiRequestOptions, ApiResponse } from "@/lib/api-client/types";
import { StoreCredentials } from "@/lib/api-client/store-credentials";

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
// are resolved (see store-credentials.ts), not in how requests are made, so
// this class is agnostic to which mode constructed it.
export class RestApiClient implements ApiClient {
  constructor(private readonly credentials: StoreCredentials) {}

  async get<TResponse>(path: string, options: ApiRequestOptions = {}): Promise<ApiResponse<TResponse>> {
    const { storeHash, apiToken } = this.credentials;

    if (!storeHash || !apiToken) {
      throw new Error("A store hash and API token are required to make a request.");
    }

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
}
