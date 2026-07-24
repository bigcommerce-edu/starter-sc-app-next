import { UnauthorizedStoreRoute } from "@/components/layout/unauthorized-store-route";

// Top-level route (sibling to (root) and [storeHash], not nested under
// either) so a redirect here renders with no site frame at all — see
// UnauthorizedStoreRoute's own comment for why AuthorizedPage redirects
// instead of rendering this inline.
export default function UnauthorizedPage() {
  return <UnauthorizedStoreRoute />;
}
