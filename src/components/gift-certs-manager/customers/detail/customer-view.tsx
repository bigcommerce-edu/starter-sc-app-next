import { cacheLife, cacheTag } from "next/cache";
import { notFound } from "next/navigation";
import { Box, Flex } from "@/components/ui/big-design";
import { ArrowBackIcon } from "@/components/ui/big-design-icons";
import { AppLink } from "@/components/ui/app-link";
import { CustomerInfoPanel } from "@/components/gift-certs-manager/customers/detail/customer-info-panel";
import { customerTag } from "@/lib/gift-certs-manager/customers/cache-tags";
import { decorateCustomerWithChannels } from "@/lib/gift-certs-manager/customers/decorate-with-channels";
import { fetchCustomer } from "@/lib/gift-certs-manager/customers/customers-api";
import { getAppUrl } from "@/lib/routing/app-url";

// Tagged with this customer's own detail tag, so a store credit mutation
// invalidates it instantly.
//
// No embedded gift-certificates table yet - that's added by the
// gift-certs-enh enhancement, once GiftCertificateTable supports being
// scoped to one recipient.
export async function CustomerView({
  id,
  storeHash,
}: {
  id: string;
  storeHash: string | undefined;
}) {
  "use cache: remote";
  cacheLife("standard");
  cacheTag(customerTag(id));

  const rawCustomer = await fetchCustomer(id, storeHash);

  // A missing customer isn't a 404 from BigCommerce itself (see
  // fetchCustomer) — this is the one place that decides a missing record
  // means "render the not-found boundary." notFound() is safe to call from
  // inside a "use cache: remote" boundary; its digest survives the cache
  // wrapper's error handler unmodified.
  if (!rawCustomer) {
    notFound();
  }

  const customer = await decorateCustomerWithChannels(rawCustomer, storeHash);

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

      <CustomerInfoPanel customer={customer} />
    </Box>
  );
}
