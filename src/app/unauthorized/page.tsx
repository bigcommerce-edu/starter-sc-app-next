import { UnauthorizedStoreRoute } from "@/components/layout/unauthorized-store-route";

// Top-level route (sibling to (root) and [storeHash]) so a redirect here
// renders with no site frame at all.
export default function UnauthorizedPage() {
  return <UnauthorizedStoreRoute />;
}
