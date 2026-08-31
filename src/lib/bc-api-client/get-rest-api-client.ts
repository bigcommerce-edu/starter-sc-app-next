import { MockRestApiClient } from "@/lib/bc-api-client/rest-client/mock-rest-client/mock-rest-client";
import { getDataMode } from "@/lib/bc-api-client/data-mode";
import { BcRestApiClient } from "@/lib/bc-api-client/rest-client/types";

// TODO: Add getConfiguredRestApiClient to return the non-mock client

export async function getRestApiClient(storeHash: string | undefined): Promise<BcRestApiClient> {
  if (getDataMode() === "MOCK") {
    return new MockRestApiClient();
  }

  // TODO: Fetch the real client
  throw new Error("Not implemented yet.");
}
