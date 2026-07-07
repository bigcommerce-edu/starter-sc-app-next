import { MockRouteHandler } from "@/lib/api-client/mock-client/types";
import { ApiRequestParams } from "@/lib/api-client/types";
import { mockCustomers } from "@/lib/customers/mock/mock-customers";
import { CUSTOMERS_PATH, CustomersResult } from "@/lib/customers/types";

function getStringParam(params: ApiRequestParams, key: string): string {
  const value = params[key];

  return typeof value === "string" ? value : "";
}

function handleCustomersListRequest(params: ApiRequestParams): CustomersResult {
  const emailIn = getStringParam(params, "email:in")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email !== "");

  const items =
    emailIn.length > 0
      ? mockCustomers.filter((customer) => emailIn.includes(customer.email.toLowerCase()))
      : mockCustomers;

  return { items };
}

export const customersListMockHandler: MockRouteHandler = {
  pattern: new RegExp(`^${CUSTOMERS_PATH}$`),
  handle: (_match, params) => handleCustomersListRequest(params),
};
