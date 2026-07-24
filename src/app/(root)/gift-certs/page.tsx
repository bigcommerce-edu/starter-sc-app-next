import GiftCertsPage from "@/app/store/[storeHash]/gift-certs/page";

// This route exists only for MOCK/STATIC development, when there's no store hash
// context in the page request. 
// See `GiftCertsPage` for the real page route.
export default function Page(props: React.ComponentProps<typeof GiftCertsPage>) {
  return <GiftCertsPage {...props} />;
}
