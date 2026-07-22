-- Initial credentials-store schema for the POSTGRES driver. Mirrors
-- sqlite-driver/schema.ts's table shapes exactly (see that file's comments
-- for the reasoning behind each column/constraint) — the two
-- Postgres-specific departures are the surrogate key, which uses GENERATED
-- ALWAYS AS IDENTITY (the standard-SQL equivalent of SQLite/D1's
-- AUTOINCREMENT), and the foreign keys below, which SQLite's schema doesn't
-- declare (see that file's own comment on why: a local single-writer file
-- has no concurrent-install race to guard against the way a real remote
-- database serving multiple instances does).
--
-- Tables are ordered parent-before-child (users, then stores, then
-- store_users/store_extensions) so this file can run top-to-bottom without
-- forward-referencing a table that doesn't exist yet — installStore mirrors
-- this same ordering in its own writes (setUser, then setStore, then
-- setStoreUser) for the same reason, see its own comment.
--
-- ON DELETE CASCADE on every foreign key matches deleteStore's existing
-- manual cascade (store_users → store_extensions → stores → any
-- now-orphaned users, see postgres-credentials-store.ts) rather than
-- changing it: that JS-level ordering already deletes children before
-- parents, so these constraints are never actually exercised by the app's
-- own code today. They're a safety net against anything else that might
-- delete a stores/users row directly (e.g. a manual psql session, a future
-- admin tool) without replicating that ordering by hand.
CREATE TABLE users (
  user_id INTEGER PRIMARY KEY,
  email TEXT NOT NULL
);

CREATE TABLE stores (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
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

-- Links a store to the App Extension registered for it at install time (see
-- lib/gift-certs-manager/register-app-extension.ts). One row per store — the
-- app only ever registers one extension per install — keyed on store_hash
-- rather than a surrogate id since that's the only lookup any caller does
-- (find the extension_id to delete on uninstall). extension_id is
-- BigCommerce's own opaque id for the App Extension (e.g.
-- "bc/store/appExtension/2"), not something this app generates.
CREATE TABLE store_extensions (
  store_hash TEXT PRIMARY KEY REFERENCES stores (store_hash) ON DELETE CASCADE,
  extension_id TEXT NOT NULL
);
