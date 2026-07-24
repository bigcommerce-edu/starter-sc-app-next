import { redirect } from "next/navigation";
import { isAuthorizedForStore } from "@/lib/session/is-authorized-for-store";

type PageProps = {
  params: Promise<Record<string, string | string[] | undefined>>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

// Shared authorization check for every page.tsx under app/[storeHash]/.
// pageComponent is the feature's own *Page Server Component, passed as a
// component reference (not pre-rendered JSX) so it only renders after the
// check below passes — this works because every step in this chain is a
// Server Component, so a function value never needs to cross a
// Server-to-Client boundary.
//
// Each page.tsx wraps this in its own <Suspense fallback={<ContentFallback
// />}> so its shell can paint before this check and the page's data fetching
// resolve.
//
// Lives per-page rather than in a shared layout since a layout's render is
// skippable by Next's client Router Cache on a same-layout navigation — see
// is-authorized-for-store.ts.
export async function AuthorizedPage({
  params,
  searchParams,
  pageComponent: PageComponent,
}: PageProps & { pageComponent: (props: PageProps) => React.ReactNode }) {
  const resolvedParams = await params;
  const storeHash = resolvedParams.storeHash;
  const storeHashString = Array.isArray(storeHash) ? storeHash[0] : storeHash;

  if (!(await isAuthorizedForStore(storeHashString))) {
    // Redirects rather than rendering inline, since [storeHash]/layout.tsx
    // has already committed to rendering AppShell around children by the
    // time this runs — see UnauthorizedStoreRoute.
    redirect("/unauthorized");
  }

  return <PageComponent params={params} searchParams={searchParams} />;
}
