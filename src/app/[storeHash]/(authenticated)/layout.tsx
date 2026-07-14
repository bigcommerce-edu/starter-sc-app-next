import { redirect } from "next/navigation";
import { isAuthorizedForStore } from "@/lib/session/is-authorized-for-store";

// The MULTITENANT auth guard: gates every page render in this route group
// behind a check that the current session is actually authorized for the
// storeHash route segment. There is nothing to check in MOCK/STATIC mode
// (see get-rest-api-client.ts and isAuthorizedForStore, which both
// trivially pass outside MULTITENANT).
//
// This does NOT cover Server Actions defined in pages under this layout —
// per Next.js's own guidance, a page/layout-level check does not extend to
// Server Actions, since they're directly POST-able independent of any page
// render. Every mutating Server Action re-verifies with the same
// isAuthorizedForStore check on its own (see actions.ts).
export default async function AuthenticatedLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedParams = await params;
  const storeHash = resolvedParams.storeHash;
  const storeHashString = Array.isArray(storeHash) ? storeHash[0] : storeHash;

  if (!(await isAuthorizedForStore(storeHashString))) {
    // TODO: revisit once a dedicated "not authorized" destination exists —
    // this redirects into /load's own verification, which will itself
    // reject (400) without a valid signed_payload_jwt query param.
    redirect("/api/app/load");
  }

  return children;
}
