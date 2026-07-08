import { MockApiClient } from "@/lib/api-client/mock-client/mock-client";
import { ApiClient, DataMode } from "@/lib/api-client/types";

const VALID_DATA_MODES: DataMode[] = ["MOCK", "STATIC", "MULTITENANT"];

export function getDataMode(): DataMode {
  const configuredMode = process.env.DATA_MODE?.toUpperCase();

  return VALID_DATA_MODES.includes(configuredMode as DataMode) ? (configuredMode as DataMode) : "MOCK";
}

// Selects the ApiClient implementation (and, eventually, the token-lookup
// strategy that backs it) based on DATA_MODE. MOCK never leaves this process;
// STATIC and MULTITENANT will wrap a real HTTP client once one exists, differing
// only in how they resolve the BigCommerce API token per request.
export function getApiClient(): ApiClient {
  const mode = getDataMode();

  switch (mode) {
    case "MOCK":
      return new MockApiClient();
    case "STATIC":
      throw new Error("STATIC data mode is not yet implemented.");
    case "MULTITENANT":
      throw new Error("MULTITENANT data mode is not yet implemented.");
  }
}
