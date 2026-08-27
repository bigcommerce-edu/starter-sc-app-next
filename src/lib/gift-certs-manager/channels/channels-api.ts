// TODO: Implement fetchChannels - fetch every channel on the store
//  - "use cache: remote" directive
//  - cacheLife() with a lifetime profile with cacheProfile()
//  - Use CACHE_PROFILE_EXTENDED - channels change
//    far less often than gift certificates or customers, so this can use a
//    longer lifetime than the calling view's own "standard" cacheLife
//  - cacheTag("channels:list")
//  - GET CHANNELS_PATH via getRestApiClient(storeHash), return { items: body.data }
