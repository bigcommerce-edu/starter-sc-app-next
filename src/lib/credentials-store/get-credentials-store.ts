// TODO: Constants to track valid and default drivers

function getConfiguredDriver() {
  // TODO: Implement getConfiguredDriver
  //  - Read CREDENTIALS_STORE_DRIVER (default to SQLITE) and switch on it,
  //    returning a new SqliteCredentialsStore for that case
  return "SQLITE";
}

function getConfiguredCredentialsStore() {
  // TODO: Implement getConfiguredCredentialsStore
  //  - Just calls getConfiguredDriver() for now
}

export function getCredentialsStore(): void {
  // TODO: Implement getCredentialsStore
  //  - Calls getConfiguredCredentialsStore() - the two are the same function
  //    until the caching enhancement gives getConfiguredCredentialsStore its
  //    own cache() wrapper
}
