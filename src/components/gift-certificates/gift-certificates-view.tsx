import { Panel } from "@/components/ui/big-design";
import { GiftCertificatesTable } from "@/components/gift-certificates/gift-certificates-table";
import { fetchGiftCertificates } from "@/lib/gift-certificates/mock-gift-certificates-api";
import { parseGiftCertificatesQuery } from "@/lib/gift-certificates/query";

export async function GiftCertificatesView({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const query = parseGiftCertificatesQuery(searchParams);
  const { items, totalItems } = await fetchGiftCertificates(query);

  return (
    <Panel header="Gift Certificates">
      <GiftCertificatesTable giftCertificates={items} totalItems={totalItems} query={query} />
    </Panel>
  );
}
