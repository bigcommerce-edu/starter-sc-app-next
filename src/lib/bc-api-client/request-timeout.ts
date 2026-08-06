// TODO: wire this into RestApiClient.get (not mutate - aborting a mutation
// does not cancel the write on BigCommerce's side, so a timeout there risks
// reporting failure for a request that actually succeeded)
