import { getDataMode } from "@/lib/bc-api-client/get-rest-api-client";
import { readSession } from "@/lib/session/session-cookie";

// Whether the current session is authorized to act on the given store —
// the one check needed at both boundaries that can't rely on each other:
// app/[storeHash]/(authenticated)/layout.tsx (gates page renders, but per
// Next.js's own guidance a page/layout-level check does NOT extend to
// Server Actions defined within pages under it — see
// https://nextjs.org/docs/app/guides/data-security#authentication-and-authorization)
// and every mutating Server Action in actions.ts (directly POST-able, so
// each must re-verify on its own). A pure check — returns a boolean rather
// than throwing or redirecting itself — so each caller decides its own
// failure handling (the layout redirects; a Server Action throws).
//
// MOCK/STATIC have no real session/store concept (see get-rest-api-client.ts)
// — there's nothing to authorize in those modes, so this trivially passes.
export async function isAuthorizedForStore(storeHash: string | undefined): Promise<boolean> {
  if (getDataMode() !== "MULTITENANT") {
    return true;
  }

  if (!storeHash) {
    return false;
  }

  const session = await readSession();

  return Boolean(session?.authenticatedStores.includes(storeHash));
}
