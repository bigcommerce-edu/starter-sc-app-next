-- Initial credentials-store schema for the D1 driver. D1 is SQLite, so table
-- shapes match sqlite-driver/schema.ts. Ordered parent-before-child.
--
-- Plain CREATE TABLE rather than IF NOT EXISTS: `wrangler d1 migrations apply`
-- runs each file once and records it in d1_migrations.
--
-- D1 enforces foreign keys by default (a bare SQLite connection does not), so
-- unlike sqlite-driver/schema.ts these constraints are live.
CREATE TABLE users (
  user_id INTEGER PRIMARY KEY,
  email TEXT NOT NULL
);

CREATE TABLE stores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  store_hash TEXT NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  scope TEXT NOT NULL,
  admin_user_id INTEGER NOT NULL REFERENCES users (user_id) ON DELETE CASCADE
);

CREATE TABLE store_users (
  store_hash TEXT NOT NULL REFERENCES stores (store_hash) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
  PRIMARY KEY (store_hash, user_id)
);
