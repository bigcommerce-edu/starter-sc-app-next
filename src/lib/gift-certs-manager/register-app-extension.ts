import { getGraphqlApiClient } from "@/lib/bc-api-client/get-graphql-api-client";
import { APP_EXTENSION_INPUT, CREATE_APP_EXTENSION_MUTATION, CreateAppExtensionResult } from "@/lib/gift-certs-manager/app-extension-mutation";
import { getCredentialsStore } from "@/lib/credentials-store/get-credentials-store";

// Registers this app's App Extension for a newly installed store, via the
// createAppExtension GraphQL mutation (see app-extension-mutation.ts), and
// records the returned extension id so the /uninstall route can look it up
// later to remove it (see deregister-app-extension.ts). Takes apiToken
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

    const result = await graphqlApiClient.request<CreateAppExtensionResult>(CREATE_APP_EXTENSION_MUTATION, {
      input: APP_EXTENSION_INPUT,
    });

    const extensionId = result.appExtension.createAppExtension.appExtension.id;

    await getCredentialsStore().setStoreExtension({ storeHash, extensionId });
  } catch (error) {
    console.error(`Failed to register the App Extension for store "${storeHash}".`, error);
  }
}
