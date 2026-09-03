-- Initial credentials-store schema for the D1 driver. D1 is SQLite, so the
-- table shapes match sqlite-driver/schema.ts rather than the Postgres
-- migrations (TEXT/INTEGER, AUTOINCREMENT instead of GENERATED AS IDENTITY).
-- Tables are ordered parent-before-child so this file runs top-to-bottom
-- without forward references.
--
-- Unlike sqlite-driver/schema.ts, this is NOT re-run on every connection:
-- `wrangler d1 migrations apply` runs each file exactly once and records it
-- in the d1_migrations table, so plain CREATE TABLE is correct here and
-- IF NOT EXISTS would only mask a migration applied out of order.
--
-- The ON DELETE CASCADE foreign keys mirror the Postgres migrations as a
-- safety net for anything deleting a stores/users row directly. Note that D1
-- enforces foreign keys by default, unlike a bare SQLite connection (where
-- PRAGMA foreign_keys defaults to off) — so unlike sqlite-driver/schema.ts,
-- which declares no foreign keys at all, these constraints are live and a
-- write that violates one fails with SQLITE_CONSTRAINT_FOREIGNKEY.
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
