import { mockRouteHandlers } from "@/lib/api-client/mock-client/handler-registry";
import { ApiClient, ApiRequestOptions } from "@/lib/api-client/types";

// Routes requests by path, the same way a real API client dispatches to a
// live endpoint. It knows nothing about any specific feature — handlers are
// registered externally (see handler-registry.ts) and matched here purely
// by pattern.
export class MockApiClient implements ApiClient {
  async get<TResponse>(path: string, options: ApiRequestOptions = {}): Promise<TResponse> {
    const params = options.params ?? {};

    for (const handler of mockRouteHandlers) {
      const match = path.match(handler.pattern);

      if (match) {
        return handler.handle(match, params) as TResponse;
      }
    }

    throw new Error(`MockApiClient has no handler for path "${path}"`);
  }
}
