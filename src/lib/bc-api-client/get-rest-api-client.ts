import { MockRestApiClient } from "@/lib/bc-api-client/rest-client/mock-rest-client/mock-rest-client";
import { getDataMode } from "@/lib/bc-api-client/data-mode";
import { BcRestApiClient } from "@/lib/bc-api-client/rest-client/types";

// Selects and configures the BigCommerce REST API client for the given
// store. Only MOCK mode is implemented so far — STATIC/MULTITENANT are
// added once the real REST client exists.
export async function getRestApiClient(storeHash: string | undefined): Promise<BcRestApiClient> {
  if (getDataMode() === "MOCK") {
    return new MockRestApiClient();
  }

  throw new Error("Not implemented yet.");
}
