import { createCipheriv, createDecipheriv, createHash, randomBytes, scryptSync } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;

function readSecret(): string {
  const secret = process.env.CREDENTIALS_ENCRYPTION_KEY;

  if (!secret) {
    throw new Error("CREDENTIALS_ENCRYPTION_KEY must be set to encrypt/decrypt stored credentials.");
  }

  return secret;
}

// A single SHA-256 pass is effectively free
// (microseconds) and is the right tool here: the input is a
// machine-generated secret with no guessable structure, so all this has to
// do is spread it evenly across 32 bytes.
let cachedKey: { secret: string; key: Buffer } | undefined;

function getKey(): Buffer {
  const secret = readSecret();

  if (cachedKey?.secret === secret) {
    return cachedKey.key;
  }

  const key = createHash("sha256").update(secret).digest();

  cachedKey = { secret, key };

  return key;
}

// The previous derivation, kept only for backward compatibility - to read 
// credentials encrypted before the switch to SHA-256 — see decrypt().
//
// scrypt is deliberately slow and CPU-hard, which is what you want when the
// input is a human-chosen password: the cost is what makes guessing one
// expensive. Against a machine-generated secret there is nothing to guess,
// so it bought no security while costing ~25ms per call under certain runtimes.
let cachedScryptKey: { secret: string; key: Buffer } | undefined;

function getScryptSyncKey(): Buffer {
  const secret = readSecret();

  if (cachedScryptKey?.secret === secret) {
    return cachedScryptKey.key;
  }

  const key = scryptSync(secret, "credentials-store-salt", KEY_LENGTH);

  cachedScryptKey = { secret, key };

  return key;
}

// Encrypts a plaintext value (e.g. a store's access token) for storage at
// rest. Returns base64(iv || authTag || ciphertext) — self-contained, so
// decrypt needs nothing but this string and the key.
export function encrypt(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, authTag, ciphertext]).toString("base64");
}

// Reverses encrypt(). Throws if the value was tampered with or encrypted
// under a different key (GCM's authTag check fails).
//
// Tries the current SHA-256 key first, then falls back to the legacy scrypt
// key so credentials written before that switch stay readable. Cost only lands 
// on genuinely legacy values. 
export function decrypt(stored: string): string {
  const raw = Buffer.from(stored, "base64");
  const iv = raw.subarray(0, IV_LENGTH);
  const authTag = raw.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = raw.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decryptWith = (key: Buffer): string => {
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  };

  try {
    return decryptWith(getKey());
  } catch {
    // Either a legacy value or a genuinely bad one. If it is the latter,
    // this second attempt throws too, and that error is what propagates.
    return decryptWith(getScryptSyncKey());
  }
}
