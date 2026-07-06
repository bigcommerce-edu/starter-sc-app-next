import { handleGiftCertificatesRequest } from "@/lib/api-client/mock-client/gift-certificates-handler";
import { ApiClient, ApiRequestOptions } from "@/lib/api-client/types";
import { GIFT_CERTIFICATES_PATH } from "@/lib/gift-certificates/types";

// Routes requests by path, the same way the real API client dispatches to a
// live endpoint. Add a new `case` here (backed by its own handler module)
// whenever mock support for another resource path is needed.
export class MockApiClient implements ApiClient {
  async get<TResponse>(path: string, options: ApiRequestOptions = {}): Promise<TResponse> {
    const params = options.params ?? {};

    switch (path) {
      case GIFT_CERTIFICATES_PATH:
        return handleGiftCertificatesRequest(params) as TResponse;
      default:
        throw new Error(`MockApiClient has no handler for path "${path}"`);
    }
  }
}
