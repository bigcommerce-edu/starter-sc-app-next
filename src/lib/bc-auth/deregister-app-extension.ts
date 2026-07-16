import { getGraphqlApiClient } from "@/lib/bc-api-client/get-graphql-api-client";
import { BcGraphqlApiClient } from "@/lib/bc-api-client/graphql-client/types";
import { getCredentialsStore } from "@/lib/credentials-store/get-credentials-store";

const DELETE_APP_EXTENSION_MUTATION = `
  mutation AppExtension($input: DeleteAppExtensionInput!) {
    appExtension {
      deleteAppExtension(input: $input) {
        deletedAppExtensionId
      }
    }
  }
`;

const RETRY_DELAY_MS = 2000;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function deleteAppExtension(graphqlApiClient: BcGraphqlApiClient, extensionId: string): Promise<void> {
  await graphqlApiClient.request(DELETE_APP_EXTENSION_MUTATION, { input: { id: extensionId } });
}

// Removes this app's App Extension (if one was ever successfully
// registered — see register-app-extension.ts) via the deleteAppExtension
// GraphQL mutation. A no-op if no store_extensions row exists, which is the
// normal case for a store that installed before this app registered
// extensions, or whose registration failed at install time. Must run before
// CredentialsStore.deleteStore, which is what actually removes the
// store_extensions row (and the store's token this needs to authenticate
// the deletion) — see uninstall-store.ts.
//
// Never throws: uninstall must still clear the store's credentials even if
// BigCommerce's side of the deletion never succeeds — a leftover App
// Extension is cosmetic (the app itself is being uninstalled), not worth
// blocking the rest of the uninstall cascade over. One delayed retry first,
// in case the failure was transient, before giving up.
export async function deregisterAppExtension(storeHash: string): Promise<void> {
  const credentialsStore = getCredentialsStore();
  const extensionId = await credentialsStore.getStoreExtension(storeHash);

  if (!extensionId) {
    return;
  }

  const graphqlApiClient = await getGraphqlApiClient(storeHash);

  try {
    await deleteAppExtension(graphqlApiClient, extensionId);
  } catch {
    await delay(RETRY_DELAY_MS);

    try {
      await deleteAppExtension(graphqlApiClient, extensionId);
    } catch {
      // No further handling: uninstall proceeds regardless (see the
      // doc comment above).
    }
  }
}
