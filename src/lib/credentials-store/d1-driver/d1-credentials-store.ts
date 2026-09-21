import { D1DatabaseLike, D1StatementLike } from "@/lib/credentials-store/d1-driver/types";
import { decrypt, encrypt } from "@/lib/credentials-store/encryption";
import { CredentialsStore, StoreExtensionRecord, StoreRecord, StoreUserRecord, UserRecord } from "@/lib/credentials-store/types";
import { AppError } from "@/lib/errors/app-error";
import { logError } from "@/lib/errors/logger";

// D1 errors can embed the failing SQL and database identity, which shouldn't
// reach a client response — every method routes through this so a raw error is
// logged and never returned as anything but a generic AppError.
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

// Cloudflare D1 driver — the MULTITENANT-capable store for Workers, where
// neither other driver works (SQLite has no persistent file, `pg` can't be
// bundled for workerd).
//
// D1 is SQLite, so the SQL matches sqlite-driver's dialect. The one meaningful
// difference: there is no BEGIN TRANSACTION, since D1 wraps each call in an
// implicit transaction. Atomicity across statements comes from batch(), which
// rolls back the whole sequence if any statement fails — that constraint is
// what shapes deleteStore/deleteUser below.
//
// The database handle is injected rather than looked up here: obtaining it is
// platform-specific (it comes from the Worker's env), while everything below
// is portable SQL. That keeps this file free of any Cloudflare import.
export class D1CredentialsStore implements CredentialsStore {
  constructor(private readonly db: D1DatabaseLike) {}

  async setStore(store: StoreRecord): Promise<void> {
    await withDatabaseErrorHandling("setStore", async () => {
      await this.db
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
      await this.db
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
      await this.db
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
      const row = await this.db
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
      await this.db
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
      const row = await this.db
        .prepare("SELECT extension_id FROM store_extensions WHERE store_hash = ?")
        .bind(storeHash)
        .first<ExtensionIdRow>();

      return row?.extension_id ?? undefined;
    });
  }

  async isStoreUserLinked(storeHash: string, userId: number): Promise<boolean> {
    return withDatabaseErrorHandling("isStoreUserLinked", async () => {
      const row = await this.db
        .prepare("SELECT 1 FROM store_users WHERE store_hash = ? AND user_id = ?")
        .bind(storeHash, userId)
        .first();

      return row !== null;
    });
  }

  // Deletes a store's row, its store-user links, its extension link, and any
  // of those users left with no other store association.
  //
  // One batch() with no preceding read: batch() takes a fixed statement list,
  // so a query whose results decide later statements would have to run
  // separately — but the cascade doesn't need the affected ids at all (see
  // deleteUsersWithNoRemainingStores).
  //
  // The orphaned-user cleanup must come last, since it checks the store_users
  // rows the earlier statements remove.
  async deleteStore(storeHash: string): Promise<void> {
    await withDatabaseErrorHandling("deleteStore", async () => {
      await this.db.batch([
        this.db.prepare("DELETE FROM store_users WHERE store_hash = ?").bind(storeHash),
        this.db.prepare("DELETE FROM store_extensions WHERE store_hash = ?").bind(storeHash),
        this.db.prepare("DELETE FROM stores WHERE store_hash = ?").bind(storeHash),
        deleteUsersWithNoRemainingStores(this.db),
      ]);
    });
  }

  // Removes one user's access to one store (the /remove_user callback's
  // scope), dropping the user row too if that was their last store
  // association. Does not touch the store or any other user.
  async deleteUser(storeHash: string, userId: number): Promise<void> {
    await withDatabaseErrorHandling("deleteUser", async () => {
      await this.db.batch([
        this.db.prepare("DELETE FROM store_users WHERE store_hash = ? AND user_id = ?").bind(storeHash, userId),
        deleteUsersWithNoRemainingStores(this.db, userId),
      ]);
    });
  }
}

// Drops every user with no remaining store_users row, optionally narrowed to
// one id. Callers have already deleted the relevant links earlier in the same
// batch, so NOT EXISTS answers this without a per-id round trip.
//
// deleteStore uses the unnarrowed form, which is safe rather than overbroad: a
// users row with no store_users row is unreachable by every read path here, so
// anything extra it removes is an orphan from a prior partial failure.
function deleteUsersWithNoRemainingStores(db: D1DatabaseLike, userId?: number): D1StatementLike {
  const narrowToUser = userId !== undefined;

  const statement = db.prepare(
    `DELETE FROM users
     WHERE NOT EXISTS (SELECT 1 FROM store_users su WHERE su.user_id = users.user_id)
       ${narrowToUser ? "AND user_id = ?" : ""}`,
  );

  return narrowToUser ? statement.bind(userId) : statement;
}
