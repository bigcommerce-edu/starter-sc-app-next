import { ArrowBackIcon, Box, Flex, Link, Panel } from "@/components/ui/big-design";
import { CustomerInfoPanel } from "@/components/customers/detail/customer-info-panel";
import { GiftCertificateTable } from "@/components/gift-certificates/list/gift-certificate-table";
import { decorateCustomerWithChannels } from "@/lib/customers/decorate-with-channels";
import { fetchCustomer } from "@/lib/customers/customers-api";
import { fetchGiftCertificates } from "@/lib/gift-certificates/gift-certificates-api";
import { parseGiftCertificatesQuery } from "@/lib/gift-certificates/query";
import { getAppUrl } from "@/lib/routing/app-url";

export async function CustomerView({
  id,
  searchParams,
  storeHash,
}: {
  id: string;
  searchParams: Record<string, string | string[] | undefined>;
  storeHash: string | undefined;
}) {
  const rawCustomer = await fetchCustomer(id);

  // recipientEmail scopes the fetch to this customer's certificates, but it's
  // implied by the route (not a user-chosen filter) and must never be echoed
  // into the URL, so it's kept out of the query passed down to the table.
  const query = parseGiftCertificatesQuery(searchParams);

  // Channel decoration and the gift-certificates fetch are independent once
  // rawCustomer.email is known, so they run concurrently rather than one
  // blocking the other.
  const [customer, { items, totalItems }] = await Promise.all([
    decorateCustomerWithChannels(rawCustomer),
    fetchGiftCertificates({ ...query, recipientEmail: rawCustomer.email }),
  ]);

  // Every row's recipient is this customer, so there's no need to decorate
  // via a separate customer lookup — the account is already known.
  const decoratedItems = items.map((certificate) => ({ ...certificate, recipientAccount: customer }));

  return (
    <Box>
      <Box marginBottom="medium">
        <Link href={getAppUrl(storeHash, "/customers")}>
          <Flex alignItems="center" flexGap="0.25rem">
            <ArrowBackIcon size="small" />
            Back to Customers
          </Flex>
        </Link>
      </Box>

      <Box marginBottom="medium">
        <CustomerInfoPanel customer={customer} />
      </Box>

      <Panel header="Gift Certificates">
        <GiftCertificateTable
          giftCertificates={decoratedItems}
          query={query}
          showFilters={false}
          showRecipientColumns={false}
          storeHash={storeHash}
          totalItems={totalItems}
        />
      </Panel>
    </Box>
  );
}
