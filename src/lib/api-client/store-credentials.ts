import { getDataMode } from "@/lib/api-client/get-api-client";

export interface StoreCredentials {
  storeHash: string | undefined;
  apiToken: string | undefined;
}

// STATIC mode always talks to the one store configured via env vars,
// regardless of urlStoreHash — there's only ever one store to pick from.
function getStaticStoreCredentials(): StoreCredentials {
  return {
    storeHash: process.env.STATIC_STORE_HASH,
    apiToken: process.env.STATIC_STORE_TOKEN,
  };
}

// MULTITENANT mode resolves credentials per-session (e.g. from an installed
// app's stored auth), scoped to whichever store the URL says we're operating
// on — a user could have active sessions in multiple stores. Not implemented
// yet, so urlStoreHash is unused for now; returning empty values here (rather
// than throwing) lets RestApiClient be the single place that decides missing
// credentials are an error, regardless of which mode caused them to be missing.
function getMultitenantStoreCredentials(urlStoreHash: string | undefined): StoreCredentials {
  void urlStoreHash;

  return { storeHash: undefined, apiToken: undefined };
}

// Resolves which store an ApiClient should talk to and how it authenticates,
// based on DATA_MODE and (in MULTITENANT) the store hash from the URL. Must
// be called from a Page component — or anywhere else already doing a dynamic
// read (e.g. cookies/session lookup) — never from a component that might run
// under the Next.js cache pattern, since MULTITENANT's session lookup is a
// dynamic read.
export function getStoreCredentials(urlStoreHash: string | undefined): StoreCredentials {
  switch (getDataMode()) {
    case "MOCK":
      return { storeHash: undefined, apiToken: undefined };
    case "STATIC":
      return getStaticStoreCredentials();
    case "MULTITENANT":
      return getMultitenantStoreCredentials(urlStoreHash);
  }
}
