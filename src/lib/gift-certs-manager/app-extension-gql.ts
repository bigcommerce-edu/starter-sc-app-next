// The GraphQL documents (and their input/result shapes) for registering this
// app's App Extension — shared by every caller: the install-time call (see
// register-app-extension.ts, which swallows failures) and the user-triggered
// retry action (see app/.../actions.ts, which surfaces success/failure).
// Centralized here so the two call sites can't drift on what "this app's
// extension" actually is.
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

// Looks up this app's already-registered extensions, so both callers of
// CREATE_APP_EXTENSION_MUTATION can check for an existing match before
// creating a new one — see findExistingAppExtensionId below for why this
// matters. url is fetched alongside id since that (plus context/model,
// implied by only this app's own extensions ever showing up here) is the
// only field that identifies "this is the extension APP_EXTENSION_INPUT
// describes," short of relying on label text, which is user-visible and
// more likely to drift/be localized than the url this app itself controls.
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
// detail page that opens this app's own gift-certificates-for-customer view.
// Fixed rather than configurable — there's only one extension this app ever
// registers, so there's nothing for a caller to parameterize.
//
// label.locales is required by the API's schema despite being documented as
// optional locale-specific overrides — omitting it entirely causes the
// mutation to be rejected, so it's set to an empty array since this app has
// no locale-specific label text to provide.
export const APP_EXTENSION_INPUT = {
  context: "LINK",
  model: "CUSTOMERS",
  url: "/customers/${id}",
  label: {
    defaultValue: "Manage Gift Certificates",
    locales: [],
  },
};
