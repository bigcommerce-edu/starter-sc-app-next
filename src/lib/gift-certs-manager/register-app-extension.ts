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
import { logError } from "@/lib/errors/logger";

// Finds this app's own App Extension among the store's existing ones,
// matched on url (the only field this app controls that identifies it,
// short of user-visible label text). See docs/ARCHITECTURE.md for why this
// matters (idempotent registration).
async function findExistingAppExtensionId(graphqlApiClient: BcGraphqlApiClient): Promise<string | undefined> {
  const result = await graphqlApiClient.request<AppExtensionsResult>(APP_EXTENSIONS_QUERY);

  return result.store.appExtensions.edges.find((edge) => edge.node.url === APP_EXTENSION_INPUT.url)?.node.id;
}

// Registers this app's App Extension, adopting an existing one instead of
// creating a duplicate — safe to call more than once for the same store.
// BigCommerce cleans up an app's extensions on uninstall automatically, so
// there's no deregistration step here.
export async function findOrCreateAppExtension(graphqlApiClient: BcGraphqlApiClient): Promise<string> {
  const existingExtensionId = await findExistingAppExtensionId(graphqlApiClient);

  if (existingExtensionId) {
    return existingExtensionId;
  }

  const result = await graphqlApiClient.request<CreateAppExtensionResult>(
    CREATE_APP_EXTENSION_MUTATION,
    { input: APP_EXTENSION_INPUT },
    { isMutation: true },
  );

  return result.appExtension.createAppExtension.appExtension.id;
}

// Registers this app's App Extension for a newly installed store. Takes
// apiToken directly (the one just returned from the OAuth handshake) rather
// than looking it up, since the credentials store may not have it written
// yet. Called from the /auth route, not from within installStore itself —
// installStore is agnostic single-click-app plumbing; registering this
// extension is a Gift Certificates Manager concern.
//
// Deliberately never throws: a failed registration shouldn't block install
// (the app is still usable without the menu shortcut). Logged rather than
// silently swallowed, since that's the only way to notice a store missing
// its shortcut. A user-triggered retry lives separately in
// components/gift-certs-manager/app-extension-status-banner/.
export async function registerAppExtension(storeHash: string, apiToken: string): Promise<void> {
  try {
    const graphqlApiClient = await getGraphqlApiClient(storeHash, apiToken);
    const extensionId = await findOrCreateAppExtension(graphqlApiClient);

    await getCredentialsStore().setStoreExtension({ storeHash, extensionId });
  } catch (error) {
    logError(`registerAppExtension: store "${storeHash}"`, error);
  }
}
