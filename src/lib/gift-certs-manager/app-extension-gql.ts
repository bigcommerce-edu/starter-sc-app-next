// TODO: define the GraphQL documents for registering this app's App
// Extension, shared by both the install-time call and the user-triggered
// retry action so they can't drift on what "this app's extension" is
//  - CREATE_APP_EXTENSION_MUTATION + CreateAppExtensionResult:
//    appExtension.createAppExtension(input) -> { appExtension: { id } }
//  - APP_EXTENSIONS_QUERY + AppExtensionsResult: looks up this store's
//    existing App Extensions - store.appExtensions.edges[].node: { id, url }
//    (url is fetched alongside id since that's the only field identifying
//    "this is the extension APP_EXTENSION_INPUT describes", short of
//    user-visible label text)
//  - APP_EXTENSION_INPUT: this app's one App Extension - a LINK-context menu
//    item on the customer detail page that opens this app's
//    gift-certificates-for-customer view: { context: "LINK", model:
//    "CUSTOMERS", url: "/customers/${id}", label: { defaultValue: "Manage
//    Gift Certificates", locales: [] } } - label.locales is required by the
//    schema despite being documented as optional, an empty array satisfies it
