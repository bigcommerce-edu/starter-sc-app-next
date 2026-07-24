import { Suspense } from "react";
import { ContentFallback } from "@/components/layout/content-fallback";
import { AppErrorRoute } from "@/components/layout/app-error-route";
import { isAppErrorReason } from "@/lib/bc-auth/app-error-reason";

// Top-level route (sibling to (root) and [storeHash], not nested under
// either) so BigCommerce's iframe navigation here renders with no site
// frame — see AppErrorRoute's own comment. reason is validated against the
// closed AppErrorReason set rather than trusted as arbitrary query-string
// content; an unset/tampered value falls back to the generic message.
//
// Kept synchronous (not itself async) with the actual searchParams read
// pushed into ResolvedAppError below, wrapped in Suspense — under
// cacheComponents, awaiting searchParams directly in this component would
// make the whole route a blocking, uncached render (confirmed via a real
// build error: "Uncached data was accessed outside of <Suspense>"), the
// same reason every other page.tsx in this app defers its own params/
// searchParams awaits into an inner Suspense-wrapped component instead of
// awaiting them at the top level.
export default function AppErrorPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<ContentFallback />}>
      <ResolvedAppError searchParams={searchParams} />
    </Suspense>
  );
}

async function ResolvedAppError({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const rawReason = resolvedSearchParams.reason;
  const reasonString = (Array.isArray(rawReason) ? rawReason[0] : rawReason) ?? null;

  // LOAD_FAILED, not INSTALL_FAILED, as the fallback for an unset/tampered
  // reason — with no context to say which route redirected here, the safer
  // default is the message that doesn't claim installation never completed
  // (see MESSAGES' own comment on why that distinction matters).
  return <AppErrorRoute reason={isAppErrorReason(reasonString) ? reasonString : "LOAD_FAILED"} />;
}
