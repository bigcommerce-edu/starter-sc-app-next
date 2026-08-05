// Placeholder home page. params/searchParams aren't used yet, but are
// already part of the signature so (root)/page.tsx (which spreads them
// straight through) doesn't need to change later.
export default function HomePage({
  params,
  searchParams,
}: {
  params: Promise<Record<string, string | string[] | undefined>>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <p>Welcome to the Gift Certificates Manager.</p>;
}
