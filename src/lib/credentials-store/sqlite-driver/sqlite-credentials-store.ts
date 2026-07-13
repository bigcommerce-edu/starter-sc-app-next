import { DatabaseSync } from "node:sqlite";
import { CredentialsStore } from "@/lib/credentials-store/types";

const DEFAULT_DB_PATH = "./data/credentials.sqlite";

function getDbPath(): string {
  return process.env.CREDENTIALS_SQLITE_PATH ?? DEFAULT_DB_PATH;
}

// TODO: create whatever table(s) this driver ends up needing, once
// CredentialsStore's methods and record shape are defined.
function openDatabase(path: string): DatabaseSync {
  return new DatabaseSync(path);
}

// Local-development driver for single-instance use — node:sqlite gives
// synchronous, in-process access to a file on disk, with no server process
// or extra dependency to install. Not suitable for MULTITENANT once this
// app runs across multiple instances (no shared file to point them all at),
// but that's a future driver's problem, not this one's.
export class SqliteCredentialsStore implements CredentialsStore {
  private readonly db: DatabaseSync;

  constructor(path: string = getDbPath()) {
    this.db = openDatabase(path);
  }

  // TODO: implement CredentialsStore's methods against this.db once they're
  // defined (see types.ts).
}
