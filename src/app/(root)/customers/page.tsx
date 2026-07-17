import CustomersPage from "@/app/[storeHash]/customers/page";

// This route exists only for MOCK/STATIC development, when there's no store hash
// context in the page request.
// See `CustomersPage` for the real page route.
export default function Page(props: React.ComponentProps<typeof CustomersPage>) {
  return <CustomersPage {...props} />;
}
