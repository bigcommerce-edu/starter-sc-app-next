import { PoolClient } from "pg";
import { getPool } from "@/lib/credentials-store/postgres-driver/get-pool";
import { decrypt, encrypt } from "@/lib/credentials-store/encryption";
import { CredentialsStore, StoreExtensionRecord, StoreRecord, StoreUserRecord, UserRecord } from "@/lib/credentials-store/types";

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
  c: string;
}

// Generic Postgres driver — works against Neon or any other standard
// Postgres server via DATABASE_URL (a plain libpq connection string), using
// node-postgres (pg) rather than any Neon-specific client. Suitable for
// MULTITENANT: unlike SqliteCredentialsStore, every instance/region talks to
// the same remote database, so store/user state is shared correctly across
// however many app instances are running.
//
// Every method below is functionally identical to SqliteCredentialsStore's
// (see its comments for the reasoning behind each shape) — only the SQL
// dialect (numbered $n placeholders, real async I/O, explicit
// BEGIN/COMMIT/ROLLBACK via a checked-out client) differs.
export class PostgresCredentialsStore implements CredentialsStore {
  async setStore(store: StoreRecord): Promise<void> {
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
  }

  async setUser(user: UserRecord): Promise<void> {
    const pool = getPool();

    await pool.query(
      `INSERT INTO users (user_id, email)
       VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET
         email = excluded.email`,
      [user.userId, user.email],
    );
  }

  async setStoreUser(storeUser: StoreUserRecord): Promise<void> {
    const pool = getPool();

    await pool.query(
      `INSERT INTO store_users (store_hash, user_id)
       VALUES ($1, $2)
       ON CONFLICT (store_hash, user_id) DO NOTHING`,
      [storeUser.storeHash, storeUser.userId],
    );
  }

  async getStoreToken(storeHash: string): Promise<string | undefined> {
    const pool = getPool();
    const result = await pool.query<StoreTokenRow>("SELECT access_token FROM stores WHERE store_hash = $1", [storeHash]);
    const row = result.rows[0];

    return row ? decrypt(row.access_token) : undefined;
  }

  // Only called after a successful createAppExtension mutation (see
  // register-app-extension.ts) — a failed registration should never reach
  // here, so this doesn't need ON CONFLICT DO NOTHING semantics beyond
  // replacing a stale extension_id from a prior install.
  async setStoreExtension(storeExtension: StoreExtensionRecord): Promise<void> {
    const pool = getPool();

    await pool.query(
      `INSERT INTO store_extensions (store_hash, extension_id)
       VALUES ($1, $2)
       ON CONFLICT (store_hash) DO UPDATE SET
         extension_id = excluded.extension_id`,
      [storeExtension.storeHash, storeExtension.extensionId],
    );
  }

  async getStoreExtension(storeHash: string): Promise<string | undefined> {
    const pool = getPool();
    const result = await pool.query<ExtensionIdRow>("SELECT extension_id FROM store_extensions WHERE store_hash = $1", [
      storeHash,
    ]);

    return result.rows[0]?.extension_id;
  }

  async isStoreUserLinked(storeHash: string, userId: number): Promise<boolean> {
    const pool = getPool();
    const result = await pool.query(
      "SELECT 1 FROM store_users WHERE store_hash = $1 AND user_id = $2",
      [storeHash, userId],
    );

    return result.rowCount !== null && result.rowCount > 0;
  }

  // Deletes a store's row, its store-user links, its extension link, and any
  // of those users left with no other store association. Run as a
  // transaction (via one checked-out client) so a crash mid-cascade can't
  // leave orphaned store_users/users rows behind.
  async deleteStore(storeHash: string): Promise<void> {
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
  }

  // Removes one user's access to one store (the /remove_user callback's
  // scope), dropping the user row too if that was their last store
  // association. Does not touch the store or any other user.
  async deleteUser(storeHash: string, userId: number): Promise<void> {
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
  }
}

// Shared by deleteStore's cascade (many candidate user ids) and deleteUser
// (always exactly one) — drops any of the given users that have no
// remaining store_users row at all.
async function deleteUsersWithNoRemainingStores(client: PoolClient, userIds: number[]): Promise<void> {
  for (const userId of userIds) {
    const { c } = (await client.query<CountRow>("SELECT COUNT(*) as c FROM store_users WHERE user_id = $1", [userId])).rows[0];

    if (Number(c) === 0) {
      await client.query("DELETE FROM users WHERE user_id = $1", [userId]);
    }
  }
}
