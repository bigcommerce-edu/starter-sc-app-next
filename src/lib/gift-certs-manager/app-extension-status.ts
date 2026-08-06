// TODO: Implement fetchAppExtensionStatus - report whether this app's App Extension is registered
//  - appExtensionStatusTag(storeHash): string - one shared tag per store
//    (only one extension is ever registered) - export it so the retry
//    action can updateTag it the moment a retry succeeds
//  - fetchStoreExtensionStatus(storeHash): "use cache: remote" directive,
//    cacheLife("extended") (non-critical cosmetic data), returns
//    { isRegistered: Boolean(await getCredentialsStore().getStoreExtension(storeHash)) }
//  - fetchAppExtensionStatus(storeHash): returns { isRegistered: true }
//    immediately when storeHash is undefined (MOCK/STATIC never run an
//    install flow, so the banner should never render outside MULTITENANT),
//    otherwise delegates to fetchStoreExtensionStatus
