export default function HomePage({
  params,
  searchParams,
}: {
  params: Promise<Record<string, string | string[] | undefined>>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // TODO: Replace this placeholder with a pass-through to the real Gift
  // Certificates list, now that page exists.
  return <p>Welcome to the Gift Certificates Manager.</p>;
}
