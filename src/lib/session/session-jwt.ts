import { jwtVerify, SignJWT } from "jose";
import { z } from "zod";
import { SessionPayload } from "@/lib/session/types";

const sessionPayloadSchema = z.object({
  userId: z.number(),
  authenticatedStores: z.array(z.string()),
  issuedAt: z.number(),
});

// Kept short since a stateless JWT can't be revoked before it expires (see
// session-cookie.ts) — a short TTL bounds how long a stale/revoked session
// stays usable.
const SESSION_TTL_SECONDS = 60 * 60;

// Absolute ceiling on how long proxy.ts will keep sliding a session forward,
// measured from payload.issuedAt (original login), not from the JWT's own
// per-refresh iat. Without this, continuous activity could keep a session
// alive indefinitely. 10 hours comfortably covers a real work session while
// still forcing re-authentication (a redirect through /load) at least daily
// — see proxy.ts for how this interacts with SESSION_TTL_SECONDS.
export const SESSION_MAX_AGE_SECONDS = 10 * 60 * 60;

// Deliberately a separate secret from BIGCOMMERCE_CLIENT_SECRET, which
// verifies BigCommerce's inbound signed_payload_jwt — a different trust
// boundary from this app signing its own outbound session cookie.
function getSessionSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;

  if (!secret) {
    throw new Error("SESSION_SECRET must be set to sign/verify session cookies.");
  }

  return new TextEncoder().encode(secret);
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSessionSecret());
}

// Throws on any failure (bad signature, expired, wrong shape, or past
// SESSION_MAX_AGE_SECONDS since issuedAt) — same uncaught-propagation
// convention as verifySignedPayload; session-cookie.ts is the one place
// that catches this and treats any failure as "no session."
export async function verifySession(jwt: string): Promise<SessionPayload> {
  const { payload } = await jwtVerify(jwt, getSessionSecret(), { algorithms: ["HS256"] });
  const session = sessionPayloadSchema.parse(payload);

  if (Date.now() / 1000 - session.issuedAt > SESSION_MAX_AGE_SECONDS) {
    throw new Error("Session exceeded its maximum age.");
  }

  return session;
}
