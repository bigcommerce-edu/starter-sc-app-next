import { jwtVerify } from "jose";
import { z } from "zod";

// The claims this app actually reads from BigCommerce's signed_payload_jwt,
// used by /load, /uninstall, and /remove_user. BigCommerce's token carries
// more (iat, nbf, exp, jti, etc.), but jose's jwtVerify already enforces
// those — this schema only needs to shape what callers go on to use.
const signedPayloadSchema = z.object({
  sub: z.string(),
  user: z.object({
    id: z.number(),
    email: z.string(),
    locale: z.string().optional(),
  }),
  owner: z.object({
    id: z.number(),
    email: z.string(),
  }),
  // The deep link that triggered the /load callback — "/" for a standard
  // Apps-menu click, or an App Extension's configured path (with template
  // variables already resolved by BigCommerce) when opened from one. See
  // https://docs.bigcommerce.com/developer/docs/integrations/apps/guide/handling-callbacks.
  // Optional defensively — not currently relied on for anything other than
  // /load's post-launch redirect, so a payload missing it shouldn't fail
  // verification.
  //
  // Required to start with "/" but not "//": getAbsoluteAppUrl resolves this
  // against APP_ORIGIN via new URL(), which treats a leading "//" as
  // protocol-relative — i.e. "//evil.com" resolves to https://evil.com,
  // ignoring the base entirely. That's not reachable today (every current
  // caller of getAbsoluteAppUrl passes a real storeHash, whose "/{hash}"
  // prefix breaks the leading "//" before this value ever reaches new URL()
  // — see app-url.ts), but that safety is incidental to callers passing a
  // storeHash, not something this value's own shape guarantees. Rejecting
  // "//" here makes the payload itself safe to redirect to regardless of
  // what a future caller does, rather than relying on every caller knowing
  // about this. BigCommerce's own documented url claim is always a
  // same-origin deep link ("/" or an App Extension path), so this rejects
  // nothing legitimate.
  url: z
    .string()
    .refine((url) => url.startsWith("/") && !url.startsWith("//"), {
      message: "url must be a root-relative path (not protocol-relative).",
    })
    .optional(),
});

export type SignedPayload = z.infer<typeof signedPayloadSchema>;

// sub (load/uninstall/remove_user) and context (auth) are both formatted as
// "stores/{hash}" — this is the one place that split happens.
export function parseStoreHash(storesSlashHash: string): string {
  const [, storeHash] = storesSlashHash.split("/");

  return storeHash;
}

// Verifies a BigCommerce signed_payload_jwt (the query param BigCommerce
// attaches to /load, /uninstall, and /remove_user calls) and returns its
// claims. Throws on any failure — a bad signature or expired/not-yet-valid
// token throws jose's own error types (JWSSignatureVerificationFailed,
// JWTExpired, etc.), and a shape mismatch throws a ZodError. Deliberately
// left uncaught here rather than normalized into one generic error, since
// callers map different failure classes to different HTTP responses (e.g.
// /load's "store not installed" check is a separate, later failure mode
// from "the JWT itself didn't verify").
export async function verifySignedPayload(signedPayloadJwt: string): Promise<SignedPayload> {
  const clientId = process.env.BIGCOMMERCE_CLIENT_ID;
  const clientSecret = process.env.BIGCOMMERCE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("BIGCOMMERCE_CLIENT_ID and BIGCOMMERCE_CLIENT_SECRET must be set to verify a signed payload.");
  }

  const { payload } = await jwtVerify(signedPayloadJwt, new TextEncoder().encode(clientSecret), {
    algorithms: ["HS256"],
    issuer: "bc",
    audience: clientId,
  });

  return signedPayloadSchema.parse(payload);
}
