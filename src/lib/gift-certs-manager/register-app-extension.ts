// TODO: Implement registerAppExtension - register this app's App Extension, adopting an existing one instead
// of creating a duplicate
//  - findExistingAppExtensionId(graphqlApiClient): queries APP_EXTENSIONS_QUERY,
//    finds the edge whose node.url matches APP_EXTENSION_INPUT.url
//  - findOrCreateAppExtension(graphqlApiClient): returns the existing id if
//    found, otherwise runs CREATE_APP_EXTENSION_MUTATION with
//    APP_EXTENSION_INPUT ({ isMutation: true }) and returns the new id -
//    safe to call more than once for the same store
//  - registerAppExtension(storeHash, apiToken): called from the /auth route
//    for a newly installed store, with the token just returned from the
//    OAuth handshake (not looked up, since the credentials store may not
//    have it written yet) - gets a GraphQL client via getGraphqlApiClient,
//    finds/creates the extension, then persists it via
//    getCredentialsStore().setStoreExtension - deliberately never throws
//    (a failed registration shouldn't block install), logged instead so a
//    missing shortcut isn't silently unnoticed

// TODO: Implement registerAppExtension - register this app's App Extension for a newly installed store
//  - registerAppExtension(storeHash, apiToken): called from the /auth route,
//    with the token just returned from the OAuth handshake (not looked up,
//    since the credentials store may not have it written yet) - gets a
//    GraphQL client via getGraphqlApiClient, finds/creates the extension via
//    findOrCreateAppExtension, then persists it via
//    getCredentialsStore().setStoreExtension
//  - deliberately never throws (a failed registration shouldn't block
//    install), logged instead so a missing shortcut isn't silently unnoticed
