import GiftCertificateDetailPage from "@/app/store/[storeHash]/gift-certs/[id]/page";

// This route exists only for MOCK/STATIC development, when there's no store hash
// context in the page request. 
// See `GiftCertificateDetailPage` for the real page route.
export default function Page(props: React.ComponentProps<typeof GiftCertificateDetailPage>) {
  return <GiftCertificateDetailPage {...props} />;
}
