-- Initial credentials-store schema for the POSTGRES driver. Mirrors
-- sqlite-driver/schema.ts's table shapes exactly (see that file's comments
-- for the reasoning behind each column/constraint) — the one Postgres-specific
-- line is the surrogate key, which uses GENERATED ALWAYS AS IDENTITY (the
-- standard-SQL equivalent of SQLite/D1's AUTOINCREMENT).
CREATE TABLE stores (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  store_hash TEXT NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  scope TEXT NOT NULL,
  admin_user_id INTEGER NOT NULL
);

CREATE TABLE users (
  user_id INTEGER PRIMARY KEY,
  email TEXT NOT NULL
);

CREATE TABLE store_users (
  store_hash TEXT NOT NULL,
  user_id INTEGER NOT NULL,
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
  store_hash TEXT PRIMARY KEY,
  extension_id TEXT NOT NULL
);
