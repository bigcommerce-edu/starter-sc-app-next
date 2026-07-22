import { BcGraphqlApiClient } from "@/lib/bc-api-client/graphql-client/types";
import { getGraphqlApiClient } from "@/lib/bc-api-client/get-graphql-api-client";
import {
  APP_EXTENSION_INPUT,
  APP_EXTENSIONS_QUERY,
  AppExtensionsResult,
  CREATE_APP_EXTENSION_MUTATION,
  CreateAppExtensionResult,
} from "@/lib/gift-certs-manager/app-extension-gql";
import { getCredentialsStore } from "@/lib/credentials-store/get-credentials-store";

// Finds this app's own App Extension among the store's existing extensions,
// if BigCommerce already has one — matched on url, since that (set from
// APP_EXTENSION_INPUT) is the only field this app controls that identifies
// "this is the extension APP_EXTENSION_INPUT describes," short of relying on
// label text, which is user-visible and more likely to drift/be localized.
// Needed because both callers below can be invoked more than once for the
// same store (a retry after a partial failure, or /auth re-running): without
// this check, createAppExtension would run again against an id BigCommerce
// already has, producing either a duplicate menu item or an API error if the
// store is at its extension-per-app cap — and either way, the retry would
// never actually converge.
async function findExistingAppExtensionId(graphqlApiClient: BcGraphqlApiClient): Promise<string | undefined> {
  const result = await graphqlApiClient.request<AppExtensionsResult>(APP_EXTENSIONS_QUERY);

  return result.store.appExtensions.edges.find((edge) => edge.node.url === APP_EXTENSION_INPUT.url)?.node.id;
}

// Registers this app's App Extension for a store, adopting the existing
// extension's id instead of creating a duplicate if BigCommerce already has
// one registered for this app (see findExistingAppExtensionId) — makes this
// safe to call more than once for the same store, which both callers below
// rely on. Records the resolved extension id so app-extension-status.ts can
// report whether registration succeeded. BigCommerce automatically cleans up
// an app's extensions on uninstall, so there is no corresponding
// deregistration step — the /uninstall route only has to clear this app's
// own stored credentials (see lib/bc-auth/uninstall-store.ts).
export async function findOrCreateAppExtension(graphqlApiClient: BcGraphqlApiClient): Promise<string> {
  const existingExtensionId = await findExistingAppExtensionId(graphqlApiClient);

  if (existingExtensionId) {
    return existingExtensionId;
  }

  const result = await graphqlApiClient.request<CreateAppExtensionResult>(CREATE_APP_EXTENSION_MUTATION, {
    input: APP_EXTENSION_INPUT,
  });

  return result.appExtension.createAppExtension.appExtension.id;
}

// Registers this app's App Extension for a newly installed store (see
// findOrCreateAppExtension for the create-vs-adopt logic). Takes apiToken
// directly — the one just returned from the OAuth handshake — rather than
// looking it up from the credentials store, since that store may not have
// been written yet when this runs. Called directly by the /auth route (see
// app/api/app/auth/route.ts) alongside installStore, not from within
// installStore itself — installStore (lib/bc-auth) is agnostic
// single-click-app plumbing, and registering this specific extension is a
// Gift Certificates Manager concern.
//
// Deliberately never throws: a failed registration should not block store
// installation (the app is still fully usable without the menu shortcut),
// so any failure is swallowed here and simply results in no
// store_extensions row being written — nothing to clean up, nothing to
// retry from this call site. Logged (rather than silently swallowed) since
// there's no other way to notice a store missing its menu shortcut; this is
// a permanent diagnostic, not a temporary debugging aid. A user-triggered
// retry (see
// components/gift-certs-manager/app-extension-status-banner/actions/retry-app-extension-registration.ts)
// is a separate action, colocated with the banner component that calls it
// rather than living here, since it needs to surface success/failure to the
// UI rather than swallow it.
export async function registerAppExtension(storeHash: string, apiToken: string): Promise<void> {
  try {
    const graphqlApiClient = await getGraphqlApiClient(storeHash, apiToken);
    const extensionId = await findOrCreateAppExtension(graphqlApiClient);

    await getCredentialsStore().setStoreExtension({ storeHash, extensionId });
  } catch (error) {
    console.error(`Failed to register the App Extension for store "${storeHash}".`, error);
  }
}
