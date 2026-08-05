// Run unconditionally on every openDatabase call — safe only because a
// local SQLite file has no concurrent, independently-deployed writers to
// race against. Not shared with Postgres, which manages schema via
// node-pg-migrate instead (see postgres-driver/migrations/).
export const CREATE_CREDENTIALS_STORE_SCHEMA = `
  CREATE TABLE IF NOT EXISTS stores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    store_hash TEXT NOT NULL UNIQUE,
    access_token TEXT NOT NULL,
    scope TEXT NOT NULL,
    admin_user_id INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS users (
    user_id INTEGER PRIMARY KEY,
    email TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS store_users (
    store_hash TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    PRIMARY KEY (store_hash, user_id)
  );
`;
