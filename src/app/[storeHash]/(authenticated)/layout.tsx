// Placeholder for the MULTITENANT auth guard: once session lookup is
// implemented, this is where a request gets verified as belonging to an
// authenticated user of the store in the storeHash route segment (redirecting
// or rejecting otherwise), before any page in this route group renders. There
// is nothing to check yet in MOCK/STATIC mode (see get-api-client.ts), so
// this only forwards children for now.
export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  return children;
}
