import HomePage from "@/app/[storeHash]/(authenticated)/page";

// This route exists only for MOCK/STATIC development, when there's no store hash
// context in the page request. The root layout enforces this by rendering an
// Unauthorized page instead of this page's content when hit in MULTITENANT mode.
// See `HomePage` for the real page route.
export default function Page(props: React.ComponentProps<typeof HomePage>) {
  return <HomePage {...props} />;
}
