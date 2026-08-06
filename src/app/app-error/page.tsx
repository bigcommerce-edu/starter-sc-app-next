import { Suspense } from "react";
import { ContentFallback } from "@/components/layout/content-fallback";
import { AppErrorRoute } from "@/components/layout/app-error-route";
import { isAppErrorReason } from "@/lib/bc-auth/app-error-reason";

// Top-level route (sibling to (root) and [storeHash]) so BigCommerce's
// iframe navigation here renders with no site frame. reason is validated
// against the closed AppErrorReason set rather than trusted as arbitrary
// query-string content.
//
// Kept synchronous, with the actual searchParams read pushed into
// ResolvedAppError below wrapped in Suspense — under cacheComponents,
// awaiting searchParams directly here would make the whole route a
// blocking, uncached render.
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

  // LOAD_FAILED, not INSTALL_FAILED, as the fallback: with no context on
  // which route redirected here, the safer default doesn't claim
  // installation never completed.
  return <AppErrorRoute reason={isAppErrorReason(reasonString) ? reasonString : "LOAD_FAILED"} />;
}
