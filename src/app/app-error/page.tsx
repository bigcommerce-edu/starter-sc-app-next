import { AppErrorRoute } from "@/components/layout/app-error-route";
import { isAppErrorReason } from "@/lib/bc-auth/app-error-reason";

// Top-level route (sibling to (root) and [storeHash]) so BigCommerce's
// iframe navigation here renders with no site frame. reason is validated
// against the closed AppErrorReason set rather than trusted as arbitrary
// query-string content.
export default async function AppErrorPage({
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
