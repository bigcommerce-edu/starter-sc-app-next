import { notFound } from "next/navigation";
import { Box, Flex } from "@bigcommerce/big-design";
import { ArrowBackIcon } from "@bigcommerce/big-design-icons";
import { AppLink } from "@/components/ui/app-link";
import { CustomerInfoPanel } from "@/components/gift-certs-manager/customers/detail/customer-info-panel";
import { decorateCustomerWithChannels } from "@/lib/gift-certs-manager/customers/decorate-with-channels";
import { fetchCustomer } from "@/lib/gift-certs-manager/customers/customers-api";
import { getAppUrl } from "@/lib/routing/app-url";

import { cacheLife, cacheTag } from "next/cache";
import { cacheProfile, CACHE_PROFILE_STANDARD } from "@/lib/cache/cache-profiles";
import { customerTag } from "@/lib/gift-certs-manager/customers/cache-tags";

// Tagged with this customer's own detail tag, so a store credit mutation
// invalidates it instantly.
export async function CustomerView({
  id,
  storeHash,
}: {
  id: string;
  storeHash: string | undefined;
}) {
  // @cache-components-only:start
  "use cache: remote";
  cacheLife(cacheProfile(CACHE_PROFILE_STANDARD));
  cacheTag(customerTag(id));
  // @cache-components-only:end

  const rawCustomer = await fetchCustomer(id, storeHash);

  // A missing customer isn't a 404 from BigCommerce itself (see
  // fetchCustomer) — this is the one place that decides a missing record
  // means "render the not-found boundary."
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
