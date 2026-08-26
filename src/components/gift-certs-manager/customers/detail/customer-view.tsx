import { notFound } from "next/navigation";
import { Box, Flex, Panel } from "@bigcommerce/big-design";
import { ArrowBackIcon } from "@bigcommerce/big-design-icons";
import { AppLink } from "@/components/ui/app-link";
import { CustomerInfoPanel } from "@/components/gift-certs-manager/customers/detail/customer-info-panel";
import { GiftCertificateTable } from "@/components/gift-certs-manager/gift-certificates/list/gift-certificate-table";
import { decorateCustomerWithChannels } from "@/lib/gift-certs-manager/customers/decorate-with-channels";
import { fetchCustomer } from "@/lib/gift-certs-manager/customers/customers-api";
import { fetchGiftCertificates } from "@/lib/gift-certs-manager/gift-certificates/gift-certificates-api";
import { parseGiftCertificatesQuery } from "@/lib/gift-certs-manager/gift-certificates/query";
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
  const rawCustomer = await fetchCustomer(id, storeHash);

  // A missing customer isn't a 404 from BigCommerce itself (see
  // fetchCustomer) — this is the one place that decides a missing record
  // means "render the not-found boundary."
  if (!rawCustomer) {
    notFound();
  }

  // to_email scopes the fetch to this customer's certificates, but it's
  // implied by the route (not a user-chosen filter), so it's kept out of the
  // query passed down to the table.
  const query = parseGiftCertificatesQuery(searchParams);

  const [customer, { items, hasNextPage }] = await Promise.all([
    decorateCustomerWithChannels(rawCustomer, storeHash),
    fetchGiftCertificates({ ...query, to_email: rawCustomer.email }, storeHash),
  ]);

  // Every row's recipient is this customer, so the account is already known.
  const decoratedItems = items.map((certificate) => ({ ...certificate, recipientAccount: customer }));

  return (
    <Box>
      <Box marginBottom="medium">
        <AppLink href={getAppUrl(storeHash, "/customers")}>
          <Flex alignItems="center" flexGap="0.25rem">
            <ArrowBackIcon size="small" />
            Back to Customers
          </Flex>
        </AppLink>
      </Box>

      <Box marginBottom="medium">
        <CustomerInfoPanel customer={customer} storeHash={storeHash} />
      </Box>

      <Panel header="Gift Certificates">
        <GiftCertificateTable
          giftCertificates={decoratedItems}
          hasNextPage={hasNextPage}
          query={query}
          showFilters={false}
          showRecipientColumns={false}
          storeHash={storeHash}
        />
      </Panel>
    </Box>
  );
}
