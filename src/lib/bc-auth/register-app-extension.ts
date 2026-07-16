import { getGraphqlApiClient } from "@/lib/bc-api-client/get-graphql-api-client";
import { getCredentialsStore } from "@/lib/credentials-store/get-credentials-store";

const CREATE_APP_EXTENSION_MUTATION = `
  mutation AppExtension($input: CreateAppExtensionInput!) {
    appExtension {
      createAppExtension(input: $input) {
        appExtension {
          id
        }
      }
    }
  }
`;

interface CreateAppExtensionResult {
  appExtension: {
    createAppExtension: {
      appExtension: {
        id: string;
      };
    };
  };
}

// This app's one App Extension: a LINK-context menu item on the customer
// detail page that opens this app's own gift-certificates-for-customer view.
// Fixed rather than configurable — there's only one extension this app ever
// registers, so there's nothing for a caller to parameterize.
//
// label.locales is required by the API's schema despite being documented as
// optional locale-specific overrides — omitting it entirely causes the
// mutation to be rejected, so it's set to an empty array since this app has
// no locale-specific label text to provide.
const APP_EXTENSION_INPUT = {
  context: "LINK",
  model: "CUSTOMERS",
  url: "/customers/${id}",
  label: {
    defaultValue: "Manage Gift Certificates",
    locales: [],
  },
};

// Registers this app's App Extension for a newly installed store, via the
// createAppExtension GraphQL mutation, and records the returned extension id
// so uninstallStore can look it up later to remove it (see
// deregister-app-extension.ts). Takes apiToken directly — the one just
// returned from the OAuth handshake (see install-store.ts) — rather than
// looking it up from the credentials store, since that store may not have
// been written yet when this runs.
//
// Deliberately never throws: a failed registration should not block store
// installation (the app is still fully usable without the menu shortcut),
// so any failure is swallowed here and simply results in no
// store_extensions row being written — nothing to clean up, nothing to
// retry from this call site. Logged (rather than silently swallowed)
// since there's no other way to notice a store missing its menu shortcut;
// this is a permanent diagnostic, not a temporary debugging aid.
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
