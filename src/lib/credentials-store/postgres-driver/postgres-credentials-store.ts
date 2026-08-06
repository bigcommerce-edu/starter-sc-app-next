export class PostgresCredentialsStore {
  // TODO: Implement PostgresCredentialsStore
  //  - A class implementing CredentialsStore, backed by getPool()
  //  - Functionally mirrors SqliteCredentialsStore - only the SQL dialect
  //    and explicit transaction handling (via one checked-out client) differ
  //  - Route every method through a helper that logs and re-throws a
  //    sanitized AppError, since pg's own errors can embed connection detail
}
