import { ApiMutationOptions, ApiRequestOptions, ApiResponse, BcRestApiClient } from "@/lib/bc-api-client/rest-client/types";
import { StoreApiCredentials } from "@/lib/bc-api-client/types";
import { API_REQUEST_TIMEOUT_MS } from "@/lib/bc-api-client/request-timeout";
import { throttleOnLowRateLimit } from "@/lib/bc-api-client/rate-limit";
import { AppError } from "@/lib/errors/app-error";

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

// Query-string values can carry customer PII for this app's endpoints (e.g.
// a customer/gift-certificate search by email) — this diagnostic log must
// never write that to stdout in plaintext, so only the path + param *names*
// (never values) are logged, not the full URL.
function toLoggableUrl(url: string): string {
  const parsed = new URL(url);

  return `${parsed.origin}${parsed.pathname}${
    [...parsed.searchParams.keys()].length ? `?${[...parsed.searchParams.keys()].map((key) => `${key}=<redacted>`).join("&")}` : ""
  }`;
}

// A 2xx response isn't guaranteed to actually be JSON — a CDN/WAF in front
// of BigCommerce's API can return an HTML error page with a 200-ish status
// — so a parse failure here becomes a clear AppError, not a raw SyntaxError.
async function parseJsonResponse<TResponse>(response: Response, path: string): Promise<TResponse> {
  const responseText = await response.text();

  try {
    return JSON.parse(responseText) as TResponse;
  } catch (error) {
    throw new AppError("UPSTREAM_API", "A BigCommerce API request failed.", {
      cause: `Response to "${path}" was not valid JSON: ${responseText.slice(0, 500)} (${error})`,
    });
  }
}

// Off by default (a developer diagnostic, gated by LOG_API_REQUESTS). Also
// doubles as a cache-observability signal: a fetch only happens on a
// `use cache` miss, so a logged request means that cache entry was missing
// or expired.
function isApiRequestLoggingEnabled(): boolean {
  return process.env.LOG_API_REQUESTS?.toLowerCase() === "true";
}

function logApiRequest(method: string, url: string, status: number, durationMs: number): void {
  if (!isApiRequestLoggingEnabled()) {
    return;
  }

  console.log(`[BigCommerce API] ${method} ${toLoggableUrl(url)} -> ${status} (${durationMs.toFixed(0)}ms)`);
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
      throw new AppError("VALIDATION", "A store hash and API token are required to make a request.");
    }

    return { storeHash, apiToken };
  }

  async get<TResponse>(path: string, options: ApiRequestOptions = {}): Promise<ApiResponse<TResponse>> {
    const { storeHash, apiToken } = this.getCredentialsOrThrow();
    const url = buildUrl(storeHash, path, options.params);

    const startedAt = performance.now();
    let response: Response;

    try {
      response = await fetch(url, {
        headers: {
          "X-Auth-Token": apiToken,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(API_REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      throw new AppError("UPSTREAM_API", "Could not reach BigCommerce.", { cause: error });
    }

    logApiRequest("GET", url, response.status, performance.now() - startedAt);

    // Runs before the error check below — rate-limit headers are present on
    // both success and error responses.
    await throttleOnLowRateLimit(response.headers);

    if (!response.ok) {
      throw new AppError("UPSTREAM_API", `A BigCommerce API request failed.`, {
        cause: `GET "${path}" failed with status ${response.status}.`,
        status: response.status,
      });
    }

    // Some GET endpoints (e.g. v2 gift certificates with no matches) respond
    // 204 rather than 200 with an empty array.
    const data = response.status === 204 ? undefined : await parseJsonResponse<TResponse>(response, path);

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
    let response: Response;

    try {
      response = await fetch(url, {
        method,
        headers: {
          "X-Auth-Token": apiToken,
          Accept: "application/json",
          ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
        },
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
        // No timeout, unlike get() — aborting doesn't cancel the write on
        // BigCommerce's side, so a timeout here risks reporting failure for
        // a mutation that actually succeeded.
      });
    } catch (error) {
      throw new AppError("UPSTREAM_API", "Could not reach BigCommerce.", { cause: error });
    }

    logApiRequest(method, url, response.status, performance.now() - startedAt);

    // Safe here too — this only delays returning an already-final
    // response/error, it never resends the request.
    await throttleOnLowRateLimit(response.headers);

    if (!response.ok) {
      throw new AppError("UPSTREAM_API", `A BigCommerce API request failed.`, {
        cause: `${method} "${path}" failed with status ${response.status}.`,
        status: response.status,
      });
    }

    // DELETE responses are typically 204 No Content.
    const data = response.status === 204 ? undefined : await parseJsonResponse<TResponse>(response, path);

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
