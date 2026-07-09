import GiftCertsPage from "@/app/[storeHash]/(authenticated)/gift-certs/page";
import { renderRootRoute } from "@/lib/routing/root-route-guard";

// This route exists only for MOCK/STATIC development, when there's no store hash
// context in the page request. `renderRootRoute()` enforces this by rendering an
// Unauthorized page instead of `GiftCertsPage` when this route is hit in MULTITENANT mode.
// See `GiftCertsPage` for the real page route.
export default function Page(props: React.ComponentProps<typeof GiftCertsPage>) {
  return renderRootRoute(<GiftCertsPage {...props} />);
}
