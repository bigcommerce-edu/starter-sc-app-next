import { PoolClient } from "pg";
import { getPool } from "@/lib/credentials-store/postgres-driver/get-pool";
import { decrypt, encrypt } from "@/lib/credentials-store/encryption";
import { CredentialsStore, StoreExtensionRecord, StoreRecord, StoreUserRecord, UserRecord } from "@/lib/credentials-store/types";
import { AppError } from "@/lib/errors/app-error";
import { logError } from "@/lib/errors/logger";

// pg's own errors can embed connection detail (host/port, etc.) that must
// never reach a client or an unredacted log — every method routes through
// this so a raw error is logged and never returned as anything but a
// generic AppError.
async function withDatabaseErrorHandling<T>(context: string, run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    logError(`PostgresCredentialsStore: ${context}`, error);
    throw new AppError("DATABASE", "A database error occurred.", { cause: error });
  }
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

// Generic Postgres driver — works against Neon or any standard Postgres
// server via DATABASE_URL, using node-postgres rather than a Neon-specific
// client. Suitable for MULTITENANT: every instance/region shares the same
// remote database. Functionally mirrors SqliteCredentialsStore; only the
// SQL dialect and explicit transaction handling differ.
export class PostgresCredentialsStore implements CredentialsStore {
  async setStore(store: StoreRecord): Promise<void> {
    await withDatabaseErrorHandling("setStore", async () => {
      const pool = getPool();

      await pool.query(
        `INSERT INTO stores (store_hash, access_token, scope, admin_user_id)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (store_hash) DO UPDATE SET
           access_token = excluded.access_token,
           scope = excluded.scope,
           admin_user_id = excluded.admin_user_id`,
        [store.storeHash, encrypt(store.accessToken), store.scope, store.adminUserId],
      );
    });
  }

  async setUser(user: UserRecord): Promise<void> {
    await withDatabaseErrorHandling("setUser", async () => {
      const pool = getPool();

      await pool.query(
        `INSERT INTO users (user_id, email)
         VALUES ($1, $2)
         ON CONFLICT (user_id) DO UPDATE SET
           email = excluded.email`,
        [user.userId, user.email],
      );
    });
  }

  async setStoreUser(storeUser: StoreUserRecord): Promise<void> {
    await withDatabaseErrorHandling("setStoreUser", async () => {
      const pool = getPool();

      await pool.query(
        `INSERT INTO store_users (store_hash, user_id)
         VALUES ($1, $2)
         ON CONFLICT (store_hash, user_id) DO NOTHING`,
        [storeUser.storeHash, storeUser.userId],
      );
    });
  }

  async getStoreToken(storeHash: string): Promise<string | undefined> {
    return withDatabaseErrorHandling("getStoreToken", async () => {
      const pool = getPool();
      const result = await pool.query<StoreTokenRow>("SELECT access_token FROM stores WHERE store_hash = $1", [storeHash]);
      const row = result.rows[0];

      return row ? decrypt(row.access_token) : undefined;
    });
  }

  // Only called after a successful createAppExtension mutation (see
  // register-app-extension.ts) — a failed registration should never reach
  // here, so this doesn't need ON CONFLICT DO NOTHING semantics beyond
  // replacing a stale extension_id from a prior install.
  async setStoreExtension(storeExtension: StoreExtensionRecord): Promise<void> {
    await withDatabaseErrorHandling("setStoreExtension", async () => {
      const pool = getPool();

      await pool.query(
        `INSERT INTO store_extensions (store_hash, extension_id)
         VALUES ($1, $2)
         ON CONFLICT (store_hash) DO UPDATE SET
           extension_id = excluded.extension_id`,
        [storeExtension.storeHash, storeExtension.extensionId],
      );
    });
  }

  async getStoreExtension(storeHash: string): Promise<string | undefined> {
    return withDatabaseErrorHandling("getStoreExtension", async () => {
      const pool = getPool();
      const result = await pool.query<ExtensionIdRow>("SELECT extension_id FROM store_extensions WHERE store_hash = $1", [
        storeHash,
      ]);

      return result.rows[0]?.extension_id;
    });
  }

  async isStoreUserLinked(storeHash: string, userId: number): Promise<boolean> {
    return withDatabaseErrorHandling("isStoreUserLinked", async () => {
      const pool = getPool();
      const result = await pool.query(
        "SELECT 1 FROM store_users WHERE store_hash = $1 AND user_id = $2",
        [storeHash, userId],
      );

      return result.rowCount !== null && result.rowCount > 0;
    });
  }

  // Deletes a store's row, its store-user links, its extension link, and any
  // of those users left with no other store association. Run as a
  // transaction (via one checked-out client) so a crash mid-cascade can't
  // leave orphaned store_users/users rows behind.
  async deleteStore(storeHash: string): Promise<void> {
    await withDatabaseErrorHandling("deleteStore", async () => {
      const pool = getPool();
      const client = await pool.connect();

      try {
        await client.query("BEGIN");

        const affectedUserIds = (
          await client.query<UserIdRow>("SELECT user_id FROM store_users WHERE store_hash = $1", [storeHash])
        ).rows.map((row) => row.user_id);

        await client.query("DELETE FROM store_users WHERE store_hash = $1", [storeHash]);
        await client.query("DELETE FROM store_extensions WHERE store_hash = $1", [storeHash]);
        await client.query("DELETE FROM stores WHERE store_hash = $1", [storeHash]);

        await deleteUsersWithNoRemainingStores(client, affectedUserIds);

        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    });
  }

  // Removes one user's access to one store (the /remove_user callback's
  // scope), dropping the user row too if that was their last store
  // association. Does not touch the store or any other user.
  async deleteUser(storeHash: string, userId: number): Promise<void> {
    await withDatabaseErrorHandling("deleteUser", async () => {
      const pool = getPool();
      const client = await pool.connect();

      try {
        await client.query("BEGIN");
        await client.query("DELETE FROM store_users WHERE store_hash = $1 AND user_id = $2", [storeHash, userId]);
        await deleteUsersWithNoRemainingStores(client, [userId]);
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    });
  }
}

// Shared by deleteStore's cascade (many candidate user ids) and deleteUser
// (always exactly one) — drops any of the given users that have no
// remaining store_users row at all. One set-based statement rather than a
// per-user SELECT COUNT + conditional DELETE loop: both callers have
// already deleted the relevant store_users rows earlier in the same
// transaction, so this only needs to ask "does this user still have any row
// left at all," which NOT EXISTS answers directly without a per-id
// round-trip.
async function deleteUsersWithNoRemainingStores(client: PoolClient, userIds: number[]): Promise<void> {
  await client.query(
    `DELETE FROM users
     WHERE user_id = ANY($1)
       AND NOT EXISTS (SELECT 1 FROM store_users su WHERE su.user_id = users.user_id)`,
    [userIds],
  );
}
