// Schema for the SQLite driver specifically — lives here (not in a shared
// lib/credentials-store/ location) because running this at runtime is a
// SQLite-local-file characteristic, not something that generalizes to other
// drivers. This file is run unconditionally on every openDatabase call (see
// sqlite-credentials-store.ts) — safe only because a local SQLite file has
// no concurrent, independently-deployed writers to race against.
//
// This is NOT reused by a Cloudflare D1 driver, despite D1 being
// SQLite-compatible SQL: a real D1 deployment manages schema via Wrangler's
// own migrations system (versioned .sql files applied with
// `wrangler d1 migrations apply`, an explicit pre-deploy step — never
// triggered by app code or automatically at deploy time), the same
// explicit-migration shape Postgres uses (see
// postgres-driver/migrations/0001_initial_schema.sql), not this
// runtime-executed file. A future D1 driver should get its own
// d1-driver/migrations/ directory, hand-copied from this file's shape once;
// there's no tooling that generates one from the other, so keep them in
// sync by hand if either changes.
//
// stores.id is a surrogate key (rather than store_hash itself) so it stays
// cheap to reference from future child tables at scale, and so the table's
// identity doesn't depend on an externally-issued string remaining stable
// forever. store_hash keeps its own UNIQUE constraint — not just NOT NULL —
// specifically so ON CONFLICT(store_hash) in setStore's upsert still has a
// unique index to target; ON CONFLICT works against any uniquely-constrained
// column, not only the primary key.
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

  -- Links a store to the App Extension registered for it at install time
  -- (see lib/gift-certs-manager/register-app-extension.ts). One row per
  -- store — the app only ever registers one extension per install — keyed
  -- on store_hash rather than a surrogate id since 
  -- that's the only lookup any caller does
  -- (find the extension_id to delete on uninstall). extension_id is
  -- BigCommerce's own opaque id for the App Extension (e.g.
  -- "bc/store/appExtension/2"), not something this app generates.
  CREATE TABLE IF NOT EXISTS store_extensions (
    store_hash TEXT PRIMARY KEY,
    extension_id TEXT NOT NULL
  );
`;
