import { MockRouteHandler } from "@/lib/api-client/mock-client/types";
import { CustomerWireRecord } from "@/lib/customers/customers-api";
import { mockCustomers } from "@/lib/customers/mock/mock-customers";
import { CUSTOMERS_PATH } from "@/lib/customers/types";

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
