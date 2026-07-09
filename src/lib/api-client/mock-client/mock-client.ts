import { mockRouteHandlers } from "@/lib/api-client/mock-client/handler-registry";
import { ApiClient, ApiRequestOptions, ApiResponse } from "@/lib/api-client/types";

// Simulates real network latency so loading/Suspense states are visible
// during local development and demos. Absent (or invalid) env vars mean no
// delay, since that's the only sane default for automated contexts (tests,
// CI) that never set them.
function getMockRequestDelayRangeMs(): { min: number; max: number } | undefined {
  const min = Number(process.env.MOCK_REQUEST_DELAY_MIN_MS);
  const max = Number(process.env.MOCK_REQUEST_DELAY_MAX_MS);

  if (!Number.isFinite(min) || !Number.isFinite(max) || min < 0 || max < min) {
    return undefined;
  }

  return { min, max };
}

function randomDelayMs(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

// Routes requests by path, the same way a real API client dispatches to a
// live endpoint. It knows nothing about any specific feature — handlers are
// registered externally (see handler-registry.ts) and matched here purely
// by pattern.
export class MockApiClient implements ApiClient {
  async get<TResponse>(path: string, options: ApiRequestOptions = {}): Promise<ApiResponse<TResponse>> {
    const delayRange = getMockRequestDelayRangeMs();

    if (delayRange) {
      await new Promise((resolve) => setTimeout(resolve, randomDelayMs(delayRange.min, delayRange.max)));
    }

    const params = options.params ?? {};

    for (const handler of mockRouteHandlers) {
      const match = path.match(handler.pattern);

      if (match) {
        const { data, headers } = handler.handle(match, params);

        return { data: data as TResponse, headers: new Headers(headers) };
      }
    }

    throw new Error(`MockApiClient has no handler for path "${path}"`);
  }

  async post<TResponse>(): Promise<ApiResponse<TResponse>> {
    throw new Error("Mutating operations are not supported in mock mode.");
  }

  async put<TResponse>(): Promise<ApiResponse<TResponse>> {
    throw new Error("Mutating operations are not supported in mock mode.");
  }

  async delete<TResponse>(): Promise<ApiResponse<TResponse>> {
    throw new Error("Mutating operations are not supported in mock mode.");
  }
}
