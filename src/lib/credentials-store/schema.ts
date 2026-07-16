// Standard SQL, shared across every CredentialsStore driver (SQLite, and
// eventually D1/Postgres) — TEXT/INTEGER, PRIMARY KEY, UNIQUE, and NOT NULL
// are all portable, so this is the one place the stores/users/store_users
// shape is defined rather than each driver redeclaring its own copy.
//
// stores.id is a surrogate key (rather than store_hash itself) so it stays
// cheap to reference from future child tables at scale, and so the table's
// identity doesn't depend on an externally-issued string remaining stable
// forever. store_hash keeps its own UNIQUE constraint — not just NOT NULL —
// specifically so ON CONFLICT(store_hash) in setStore's upsert still has a
// unique index to target; ON CONFLICT works against any uniquely-constrained
// column, not only the primary key.
//
// One known non-portable line: `INTEGER PRIMARY KEY AUTOINCREMENT` is
// SQLite/D1 syntax (same engine, so it transfers unchanged between those
// two). A Postgres driver would need `GENERATED ALWAYS AS IDENTITY` instead
// — the one place a future driver may need to diverge from this shared
// schema rather than using it verbatim.
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
  -- (see lib/bc-auth/register-app-extension.ts). One row per store — the
  -- app only ever registers one extension per install — keyed on store_hash
  -- rather than a surrogate id since that's the only lookup any caller does
  -- (find the extension_id to delete on uninstall). extension_id is
  -- BigCommerce's own opaque id for the App Extension (e.g.
  -- "bc/store/appExtension/2"), not something this app generates.
  CREATE TABLE IF NOT EXISTS store_extensions (
    store_hash TEXT PRIMARY KEY,
    extension_id TEXT NOT NULL
  );
`;
