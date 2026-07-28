import CustomerDetailPage from "@/app/store/[storeHash]/customers/[id]/page";

// This route exists only for MOCK/STATIC development, when there's no store hash
// context in the page request.
// See `CustomerDetailPage` for the real page route.
export default function Page(props: React.ComponentProps<typeof CustomerDetailPage>) {
  return <CustomerDetailPage {...props} />;
}
