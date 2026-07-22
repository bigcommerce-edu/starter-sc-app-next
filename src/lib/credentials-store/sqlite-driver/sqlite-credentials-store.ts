import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { CREATE_CREDENTIALS_STORE_SCHEMA } from "@/lib/credentials-store/schema";
import { decrypt, encrypt } from "@/lib/credentials-store/sqlite-driver/encryption";
import { CredentialsStore, StoreExtensionRecord, StoreRecord, StoreUserRecord, UserRecord } from "@/lib/credentials-store/types";

const DEFAULT_DB_PATH = "./data/credentials.sqlite";

function getDbPath(): string {
  return process.env.CREDENTIALS_SQLITE_PATH ?? DEFAULT_DB_PATH;
}

// DatabaseSync creates the database file itself if it's missing, but not any
// missing parent directory — the default ./data/ is gitignored (it's a
// runtime artifact, not something the repo ships) and nothing else creates
// it, so without this, a first run fails with a raw "unable to open
// database file" (SQLITE_CANTOPEN) rather than a clear error.
function openDatabase(path: string): DatabaseSync {
  mkdirSync(dirname(path), { recursive: true });

  const db = new DatabaseSync(path);

  db.exec(CREATE_CREDENTIALS_STORE_SCHEMA);

  return db;
}

interface StoreTokenRow {
  access_token: string;
}

interface ExtensionIdRow {
  extension_id: string;
}

interface UserIdRow {
  user_id: number;
}

interface CountRow {
  c: number;
}

interface ExistsRow {
  found: number;
}

// Local-development driver for single-instance use — node:sqlite gives
// synchronous, in-process access to a file on disk, with no server process
// or extra dependency to install. Not suitable for MULTITENANT once this
// app runs across multiple instances (no shared file to point them all at),
// but that's a future driver's problem, not this one's.
//
// All methods are synchronous under the hood (node:sqlite has no async
// API) but return Promises to satisfy CredentialsStore, whose signature
// stays async for drivers that do need real I/O.
export class SqliteCredentialsStore implements CredentialsStore {
  private readonly db: DatabaseSync;

  constructor(path: string = getDbPath()) {
    this.db = openDatabase(path);
  }

  async setStore(store: StoreRecord): Promise<void> {
    this.db
      .prepare(
        `INSERT INTO stores (store_hash, access_token, scope, admin_user_id)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(store_hash) DO UPDATE SET
           access_token = excluded.access_token,
           scope = excluded.scope,
           admin_user_id = excluded.admin_user_id`,
      )
      .run(store.storeHash, encrypt(store.accessToken), store.scope, store.adminUserId);
  }

  async setUser(user: UserRecord): Promise<void> {
    this.db
      .prepare(
        `INSERT INTO users (user_id, email)
         VALUES (?, ?)
         ON CONFLICT(user_id) DO UPDATE SET
           email = excluded.email`,
      )
      .run(user.userId, user.email);
  }

  async setStoreUser(storeUser: StoreUserRecord): Promise<void> {
    this.db
      .prepare(
        `INSERT INTO store_users (store_hash, user_id)
         VALUES (?, ?)
         ON CONFLICT(store_hash, user_id) DO NOTHING`,
      )
      .run(storeUser.storeHash, storeUser.userId);
  }

  async getStoreToken(storeHash: string): Promise<string | undefined> {
    const row = this.db.prepare("SELECT access_token FROM stores WHERE store_hash = ?").get(storeHash) as unknown as
      | StoreTokenRow
      | undefined;

    return row ? decrypt(row.access_token) : undefined;
  }

  // Only called after a successful createAppExtension mutation (see
  // register-app-extension.ts) — a failed registration should never reach
  // here, so this doesn't need ON CONFLICT DO NOTHING semantics beyond
  // replacing a stale extension_id from a prior install.
  async setStoreExtension(storeExtension: StoreExtensionRecord): Promise<void> {
    this.db
      .prepare(
        `INSERT INTO store_extensions (store_hash, extension_id)
         VALUES (?, ?)
         ON CONFLICT(store_hash) DO UPDATE SET
           extension_id = excluded.extension_id`,
      )
      .run(storeExtension.storeHash, storeExtension.extensionId);
  }

  async getStoreExtension(storeHash: string): Promise<string | undefined> {
    const row = this.db.prepare("SELECT extension_id FROM store_extensions WHERE store_hash = ?").get(storeHash) as unknown as
      | ExtensionIdRow
      | undefined;

    return row?.extension_id;
  }

  async isStoreUserLinked(storeHash: string, userId: number): Promise<boolean> {
    const row = this.db
      .prepare("SELECT 1 as found FROM store_users WHERE store_hash = ? AND user_id = ?")
      .get(storeHash, userId) as unknown as ExistsRow | undefined;

    return row !== undefined;
  }

  // Deletes a store's row, its store-user links, its extension link, and any
  // of those users left with no other store association. Run as a
  // transaction so a crash mid-cascade can't leave orphaned
  // store_users/users rows behind.
  async deleteStore(storeHash: string): Promise<void> {
    this.db.exec("BEGIN TRANSACTION");

    try {
      const affectedUserIds = (
        this.db.prepare("SELECT user_id FROM store_users WHERE store_hash = ?").all(storeHash) as unknown as UserIdRow[]
      ).map((row) => row.user_id);

      this.db.prepare("DELETE FROM store_users WHERE store_hash = ?").run(storeHash);
      this.db.prepare("DELETE FROM store_extensions WHERE store_hash = ?").run(storeHash);
      this.db.prepare("DELETE FROM stores WHERE store_hash = ?").run(storeHash);

      const countRemainingStoreUsersStmt = this.db.prepare("SELECT COUNT(*) as c FROM store_users WHERE user_id = ?");
      const deleteUserStmt = this.db.prepare("DELETE FROM users WHERE user_id = ?");

      for (const userId of affectedUserIds) {
        const { c } = countRemainingStoreUsersStmt.get(userId) as unknown as CountRow;

        if (c === 0) {
          deleteUserStmt.run(userId);
        }
      }

      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  // Removes one user's access to one store (the /remove_user callback's
  // scope), dropping the user row too if that was their last store
  // association. Does not touch the store or any other user.
  async deleteUser(storeHash: string, userId: number): Promise<void> {
    this.db.exec("BEGIN TRANSACTION");

    try {
      this.db.prepare("DELETE FROM store_users WHERE store_hash = ? AND user_id = ?").run(storeHash, userId);

      const { c } = this.db.prepare("SELECT COUNT(*) as c FROM store_users WHERE user_id = ?").get(userId) as unknown as CountRow;

      if (c === 0) {
        this.db.prepare("DELETE FROM users WHERE user_id = ?").run(userId);
      }

      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }
}
