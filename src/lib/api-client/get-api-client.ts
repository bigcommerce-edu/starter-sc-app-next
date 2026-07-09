import { cache } from "react";
import { MockApiClient } from "@/lib/api-client/mock-client/mock-client";
import { RestApiClient } from "@/lib/api-client/rest-client/rest-client";
import { StoreCredentials } from "@/lib/api-client/store-credentials";
import { ApiClient, DataMode } from "@/lib/api-client/types";

const VALID_DATA_MODES: DataMode[] = ["MOCK", "STATIC", "MULTITENANT"];

export function getDataMode(): DataMode {
  const configuredMode = process.env.DATA_MODE?.toUpperCase();

  return VALID_DATA_MODES.includes(configuredMode as DataMode) ? (configuredMode as DataMode) : "MOCK";
}

// Cached by React's per-request memoization, keyed on the primitive
// storeHash/apiToken values (not the StoreCredentials object, whose identity
// changes on every getStoreCredentials call) — so within one request, calls
// that resolve to the same store/token reuse the same RestApiClient
// instance, and calls with different credentials (e.g. MULTITENANT fan-out
// across stores, if that's ever needed) each get their own.
const getCachedRestApiClient = cache((storeHash: string | undefined, apiToken: string | undefined): ApiClient => {
  return new RestApiClient({ storeHash, apiToken });
});

// Selects the ApiClient implementation for the given credentials. Callers
// (Page components, or anything else already doing a dynamic read) are
// responsible for resolving those credentials via getStoreCredentials first —
// this function itself makes no dynamic reads, so it's safe to call from a
// component that might run under the Next.js cache pattern.
export function getApiClient(credentials: StoreCredentials): ApiClient {
  const mode = getDataMode();

  if (mode === "MOCK") {
    return new MockApiClient();
  }

  return getCachedRestApiClient(credentials.storeHash, credentials.apiToken);
}
