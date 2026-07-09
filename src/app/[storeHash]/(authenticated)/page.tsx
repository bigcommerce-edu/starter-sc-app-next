// REPLACE this placeholder with your own app's root page component.
export default function HomePage({
  params,
  searchParams,
}: {
  params: Promise<Record<string, string | string[] | undefined>>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  void params;
  void searchParams;

  return <p>Hello from the gift certificates manager.</p>;
}
