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
// of BigCommerce's API can return an HTML error page with a 200/success-ish
// status in some failure modes — so response.json() throwing a raw
// SyntaxError here would otherwise surface as an opaque, unrelated-looking
// parse error rather than a clear "the API response was malformed" failure.
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

    // Runs before the error check below (and regardless of response.ok) —
    // BigCommerce's rate-limit headers are present on every response, success
    // or error alike, so this needs to see both. See rate-limit.ts's own
    // comment on why a proactive wait (never a retry) is safe here.
    await throttleOnLowRateLimit(response.headers);

    if (!response.ok) {
      throw new AppError("UPSTREAM_API", `A BigCommerce API request failed.`, {
        cause: `GET "${path}" failed with status ${response.status}.`,
        status: response.status,
      });
    }

    // Some GET endpoints (e.g. v2 gift certificates, when nothing matches the
    // query) respond 204 No Content rather than 200 with an empty array —
    // parsing an empty body as JSON would throw, so only attempt it when
    // there's actually a body. Callers that expect a list should treat a
    // missing/undefined data as empty, the same way they'd treat [].
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
        // Deliberately no AbortSignal.timeout here, unlike get() — a client-
        // side timeout on a mutation only stops us from *waiting* for the
        // response; it does nothing to cancel the write on BigCommerce's
        // side. If the request had already landed by the time we gave up,
        // the mutation can still succeed after we've told the caller it
        // failed — an ambiguous outcome that's worse than just waiting
        // however long BigCommerce/the deployment platform actually takes.
        // Reads have no such risk (aborting a GET has no side effect to
        // leave dangling), which is why get() keeps its own timeout above.
      });
    } catch (error) {
      throw new AppError("UPSTREAM_API", "Could not reach BigCommerce.", { cause: error });
    }

    logApiRequest(method, url, response.status, performance.now() - startedAt);

    // See the identical call in get() above — same reasoning applies to
    // mutations: this only ever delays returning the (already-final)
    // response/thrown error, never resends the request, so it's safe here
    // despite mutations otherwise getting no timeout/retry treatment.
    await throttleOnLowRateLimit(response.headers);

    if (!response.ok) {
      throw new AppError("UPSTREAM_API", `A BigCommerce API request failed.`, {
        cause: `${method} "${path}" failed with status ${response.status}.`,
        status: response.status,
      });
    }

    // DELETE responses are typically 204 No Content — parsing an empty body
    // as JSON would throw, so only attempt it when there's actually a body.
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
