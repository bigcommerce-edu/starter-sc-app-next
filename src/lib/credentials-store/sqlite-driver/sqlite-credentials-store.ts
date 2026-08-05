export class SqliteCredentialsStore {
  // TODO: Implement SqliteCredentialsStore
  //  - A class implementing CredentialsStore, backed by node:sqlite
  //  - Route every method through a helper that logs and re-throws a
  //    sanitized AppError, since node:sqlite's own errors can embed the
  //    local database file path
  //  - setStore/setUser/setStoreUser are upserts (ON CONFLICT DO UPDATE)
  //  - deleteStore/deleteUser cascade in a transaction
}
