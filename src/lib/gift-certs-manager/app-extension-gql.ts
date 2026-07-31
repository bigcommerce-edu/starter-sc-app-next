// GraphQL documents for registering this app's App Extension, shared by both
// the install-time call and the user-triggered retry action so they can't
// drift on what "this app's extension" is.
export const CREATE_APP_EXTENSION_MUTATION = `
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

export interface CreateAppExtensionResult {
  appExtension: {
    createAppExtension: {
      appExtension: {
        id: string;
      };
    };
  };
}

// Looks up this store's existing App Extensions. url is fetched alongside id
// since that's the only field identifying "this is the extension
// APP_EXTENSION_INPUT describes" short of user-visible, localizable label text.
export const APP_EXTENSIONS_QUERY = `
  query AppExtensions {
    store {
      appExtensions {
        edges {
          node {
            id
            url
          }
        }
      }
    }
  }
`;

export interface AppExtensionsResult {
  store: {
    appExtensions: {
      edges: Array<{
        node: {
          id: string;
          url: string;
        };
      }>;
    };
  };
}

// This app's one App Extension: a LINK-context menu item on the customer
// detail page that opens this app's gift-certificates-for-customer view.
// label.locales is required by the schema despite being documented as
// optional — an empty array satisfies it since there's no localized text.
export const APP_EXTENSION_INPUT = {
  context: "LINK",
  model: "CUSTOMERS",
  url: "/customers/${id}",
  label: {
    defaultValue: "Manage Gift Certificates",
    locales: [],
  },
};
