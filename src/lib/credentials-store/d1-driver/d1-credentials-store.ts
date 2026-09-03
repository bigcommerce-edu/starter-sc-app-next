import { getDatabase } from "@/lib/credentials-store/d1-driver/get-database";
import { decrypt, encrypt } from "@/lib/credentials-store/encryption";
import { CredentialsStore, StoreExtensionRecord, StoreRecord, StoreUserRecord, UserRecord } from "@/lib/credentials-store/types";
import { AppError } from "@/lib/errors/app-error";
import { logError } from "@/lib/errors/logger";

// D1's errors can embed the failing SQL and the binding/database identity,
// which shouldn't reach a client response — every method routes through this
// so a raw error is logged and never returned as anything but a generic
// AppError.
async function withDatabaseErrorHandling<T>(context: string, run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    logError(`D1CredentialsStore: ${context}`, error);
    throw new AppError("DATABASE", "A database error occurred.", { cause: error });
  }
}

interface StoreTokenRow {
  access_token: string;
}

interface ExtensionIdRow {
  extension_id: string;
}

// Cloudflare D1 driver — the MULTITENANT-capable store for Workers
// deployments, where neither of the other drivers works: SQLite needs a
// persistent local file the runtime doesn't have, and Postgres needs `pg`,
// which can't be bundled for workerd at all (see next.config.ts).
//
// D1 *is* SQLite, so the SQL here is the same dialect as sqlite-driver's,
// down to the ON CONFLICT upserts. Two things differ, both from D1 being
// remote rather than in-process:
//
//   - Every call is genuinely async (sqlite-driver's node:sqlite calls are
//     synchronous under their Promise-returning signatures).
//   - There is no BEGIN TRANSACTION. D1 rejects explicit transaction control
//     because it wraps each call in an implicit transaction of its own;
//     atomicity across statements comes from batch(), which Cloudflare
//     documents as a real transaction that "aborts or rolls back the entire
//     sequence" if any statement fails. That constraint is what shapes
//     deleteStore/deleteUser below.
export class D1CredentialsStore implements CredentialsStore {
  async setStore(store: StoreRecord): Promise<void> {
    await withDatabaseErrorHandling("setStore", async () => {
      await getDatabase()
        .prepare(
          `INSERT INTO stores (store_hash, access_token, scope, admin_user_id)
           VALUES (?, ?, ?, ?)
           ON CONFLICT(store_hash) DO UPDATE SET
             access_token = excluded.access_token,
             scope = excluded.scope,
             admin_user_id = excluded.admin_user_id`,
        )
        .bind(store.storeHash, encrypt(store.accessToken), store.scope, store.adminUserId)
        .run();
    });
  }

  async setUser(user: UserRecord): Promise<void> {
    await withDatabaseErrorHandling("setUser", async () => {
      await getDatabase()
        .prepare(
          `INSERT INTO users (user_id, email)
           VALUES (?, ?)
           ON CONFLICT(user_id) DO UPDATE SET
             email = excluded.email`,
        )
        .bind(user.userId, user.email)
        .run();
    });
  }

  async setStoreUser(storeUser: StoreUserRecord): Promise<void> {
    await withDatabaseErrorHandling("setStoreUser", async () => {
      await getDatabase()
        .prepare(
          `INSERT INTO store_users (store_hash, user_id)
           VALUES (?, ?)
           ON CONFLICT(store_hash, user_id) DO NOTHING`,
        )
        .bind(storeUser.storeHash, storeUser.userId)
        .run();
    });
  }

  async getStoreToken(storeHash: string): Promise<string | undefined> {
    return withDatabaseErrorHandling("getStoreToken", async () => {
      const row = await getDatabase()
        .prepare("SELECT access_token FROM stores WHERE store_hash = ?")
        .bind(storeHash)
        .first<StoreTokenRow>();

      return row ? decrypt(row.access_token) : undefined;
    });
  }

  // Only called after a successful createAppExtension mutation (see
  // register-app-extension.ts) — a failed registration should never reach
  // here, so this doesn't need ON CONFLICT DO NOTHING semantics beyond
  // replacing a stale extension_id from a prior install.
  async setStoreExtension(storeExtension: StoreExtensionRecord): Promise<void> {
    await withDatabaseErrorHandling("setStoreExtension", async () => {
      await getDatabase()
        .prepare(
          `INSERT INTO store_extensions (store_hash, extension_id)
           VALUES (?, ?)
           ON CONFLICT(store_hash) DO UPDATE SET
             extension_id = excluded.extension_id`,
        )
        .bind(storeExtension.storeHash, storeExtension.extensionId)
        .run();
    });
  }

  async getStoreExtension(storeHash: string): Promise<string | undefined> {
    return withDatabaseErrorHandling("getStoreExtension", async () => {
      const row = await getDatabase()
        .prepare("SELECT extension_id FROM store_extensions WHERE store_hash = ?")
        .bind(storeHash)
        .first<ExtensionIdRow>();

      return row?.extension_id ?? undefined;
    });
  }

  async isStoreUserLinked(storeHash: string, userId: number): Promise<boolean> {
    return withDatabaseErrorHandling("isStoreUserLinked", async () => {
      const row = await getDatabase()
        .prepare("SELECT 1 FROM store_users WHERE store_hash = ? AND user_id = ?")
        .bind(storeHash, userId)
        .first();

      return row !== null;
    });
  }

  // Deletes a store's row, its store-user links, its extension link, and any
  // of those users left with no other store association.
  //
  // Unlike the other two drivers, the read that finds the affected users
  // can't sit inside the transaction: batch() takes a fixed list of
  // statements up front, so a query whose results decide later statements
  // has to run before it. That's fine here because the cascade doesn't
  // actually need those ids — see deleteUsersWithNoRemainingStores, which
  // asks the set-based question directly. So this is a single batch() with
  // no preceding read at all, which is both atomic and one round trip
  // instead of two.
  //
  // Statements run in order, children before parents. D1 enforces foreign
  // keys by default (verified: inserting a store_users row for a missing
  // store fails with SQLITE_CONSTRAINT_FOREIGNKEY), but the schema's
  // ON DELETE CASCADE means deleting `stores` first would also work — the
  // child rows would just go with it. Explicit child-first deletes are kept
  // anyway so this reads the same as the other two drivers' cascades and
  // doesn't silently depend on the FK actions to be correct.
  //
  // The one ordering that IS load-bearing: the orphaned-user cleanup must
  // come last, since it checks the store_users rows the earlier statements
  // remove.
  async deleteStore(storeHash: string): Promise<void> {
    await withDatabaseErrorHandling("deleteStore", async () => {
      const db = getDatabase();

      await db.batch([
        db.prepare("DELETE FROM store_users WHERE store_hash = ?").bind(storeHash),
        db.prepare("DELETE FROM store_extensions WHERE store_hash = ?").bind(storeHash),
        db.prepare("DELETE FROM stores WHERE store_hash = ?").bind(storeHash),
        deleteUsersWithNoRemainingStores(db),
      ]);
    });
  }

  // Removes one user's access to one store (the /remove_user callback's
  // scope), dropping the user row too if that was their last store
  // association. Does not touch the store or any other user.
  async deleteUser(storeHash: string, userId: number): Promise<void> {
    await withDatabaseErrorHandling("deleteUser", async () => {
      const db = getDatabase();

      await db.batch([
        db.prepare("DELETE FROM store_users WHERE store_hash = ? AND user_id = ?").bind(storeHash, userId),
        deleteUsersWithNoRemainingStores(db, userId),
      ]);
    });
  }
}

// Drops every user that no longer has any store_users row, optionally
// narrowed to one user id. Shared by deleteStore's cascade and deleteUser.
//
// Both callers have already deleted the relevant store_users rows earlier in
// the same batch, so this only needs to ask "does this user still have any
// row left at all," which NOT EXISTS answers without a per-id round trip.
// The Postgres driver passes an explicit id array (`user_id = ANY($1)`);
// SQLite has no array-parameter equivalent, and D1's batch() can't take
// parameters derived from an earlier statement's results anyway, so
// deleteStore relies on the unnarrowed form instead.
//
// Unnarrowed is safe rather than overbroad: a users row with no store_users
// row is unreachable by every read path in this app (getStoreToken and
// isStoreUserLinked both go through a store), so it is already garbage. The
// only rows this could delete beyond the strict cascade are orphans left by
// an earlier partial failure, which is a cleanup, not a side effect.
function deleteUsersWithNoRemainingStores(db: D1Database, userId?: number): D1PreparedStatement {
  const narrowToUser = userId !== undefined;

  const statement = db.prepare(
    `DELETE FROM users
     WHERE NOT EXISTS (SELECT 1 FROM store_users su WHERE su.user_id = users.user_id)
       ${narrowToUser ? "AND user_id = ?" : ""}`,
  );

  return narrowToUser ? statement.bind(userId) : statement;
}
