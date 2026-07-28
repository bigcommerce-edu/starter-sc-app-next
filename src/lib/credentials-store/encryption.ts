import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;

// Derives a fixed-length key from CREDENTIALS_ENCRYPTION_KEY rather than
// requiring the env var itself to already be exactly 32 bytes. The salt is
// fixed since there's one static env secret to derive from, not per-user
// passwords to individually protect.
function getKey(): Buffer {
  const secret = process.env.CREDENTIALS_ENCRYPTION_KEY;

  if (!secret) {
    throw new Error("CREDENTIALS_ENCRYPTION_KEY must be set to encrypt/decrypt stored credentials.");
  }

  return scryptSync(secret, "credentials-store-salt", KEY_LENGTH);
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
export function decrypt(stored: string): string {
  const raw = Buffer.from(stored, "base64");
  const iv = raw.subarray(0, IV_LENGTH);
  const authTag = raw.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = raw.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}
