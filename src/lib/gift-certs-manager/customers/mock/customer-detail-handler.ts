import { MockRouteHandler } from "@/lib/api-client/mock-client/types";
import { CustomerWireRecord } from "@/lib/gift-certs-manager/customers/customers-api";
import { mockCustomers } from "@/lib/gift-certs-manager/customers/mock/mock-customers";
import { CUSTOMERS_PATH } from "@/lib/gift-certs-manager/customers/types";

function handleCustomerDetailRequest(id: string): { data: CustomerWireRecord } {
  const customer = mockCustomers.find((item) => String(item.id) === id);

  if (!customer) {
    throw new Error(`No customer found with id "${id}".`);
  }

  return { data: customer };
}

export const customerDetailMockHandler: MockRouteHandler = {
  pattern: new RegExp(`^${CUSTOMERS_PATH}/([^/]+)$`),
  handle: (match) => handleCustomerDetailRequest(match[1]),
};
