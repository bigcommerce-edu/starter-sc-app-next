import { isAuthorizedForStore } from "@/lib/session/is-authorized-for-store";

type PageProps = {
  params: Promise<Record<string, string | string[] | undefined>>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

// Shared by every page.tsx under app/[storeHash]/ — replaces what used to
// be an identical copy of this same check-then-render logic pasted into
// each one. pageComponent is the feature's own *Page Server Component
// (e.g. GiftCertificatesPage, CustomerDetailPage), passed as a component
// reference (not pre-rendered JSX) so it only renders after the check
// below passes. Passing a component type as a prop, rather than an
// element, works here because every step in this chain is a Server
// Component — this never crosses a Server-to-Client boundary, where a
// function/component value can't serialize.
//
// Each page.tsx still wraps this itself in its own <Suspense
// fallback={<ContentFallback />}> (not done here) — that's what lets that
// page's shell paint immediately while this component's own async auth
// check + the page's data fetching resolve, rather than blocking on both.
//
// This has to live per-page rather than in a shared layout: a layout's
// render is skippable by Next's client Router Cache on a same-layout
// client-side navigation, so it isn't a reliable enforcement point — see
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
    throw new Error("Not authorized for this store.");
  }

  return <PageComponent params={params} searchParams={searchParams} />;
}
