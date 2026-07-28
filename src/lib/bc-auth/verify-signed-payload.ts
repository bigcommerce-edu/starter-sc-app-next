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
  // Apps-menu click, or an App Extension's configured path when opened from
  // one. Optional since only /load's post-launch redirect uses it. Must
  // start with "/" but not "//": a leading "//" is protocol-relative
  // ("//evil.com" resolves to https://evil.com against new URL()), so
  // rejecting it here keeps the payload safe to redirect to regardless of
  // caller — see getAbsoluteAppUrl.
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

// Verifies a BigCommerce signed_payload_jwt and returns its claims. Throws
// jose's own error types on a bad/expired signature, or a ZodError on a
// shape mismatch — left uncaught so callers can map different failure
// classes to different responses (see isSignedPayloadVerificationError).
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
