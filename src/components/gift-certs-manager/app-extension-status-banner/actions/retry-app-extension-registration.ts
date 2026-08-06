// TODO: user-triggered retry for a failed install-time registration
//  - "use server"
//  - isAuthorizedForStore check, same as any other Server Action
//  - shares findOrCreateAppExtension with registerAppExtension, so a retry
//    after a partial failure adopts the already-created extension's id
//    instead of creating a duplicate
//  - getGraphqlApiClient without an apiToken override, since install has
//    already persisted the store's token by the time a user can click
//    "Retry"
//  - persist via getCredentialsStore().setStoreExtension, then
//    updateTag(appExtensionStatusTag(storeHash)) on success
