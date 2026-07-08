import { MockRouteHandler } from "@/lib/api-client/mock-client/types";
import { ApiRequestParams } from "@/lib/api-client/types";
import { mockCustomers } from "@/lib/customers/mock/mock-customers";
import { CUSTOMERS_PATH, Customer, CustomersListResult } from "@/lib/customers/types";

function getStringParam(params: ApiRequestParams, key: string): string {
  const value = params[key];

  return typeof value === "string" ? value : "";
}

function getNumberParam(params: ApiRequestParams, key: string, fallback: number): number {
  const value = Number(params[key]);

  return Number.isInteger(value) && value > 0 ? value : fallback;
}

function getFullName(customer: Customer): string {
  return `${customer.firstName} ${customer.lastName}`;
}

function handleCustomersListRequest(params: ApiRequestParams): CustomersListResult {
  const emailIn = getStringParam(params, "email:in")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email !== "");

  // email:in is used by fetchCustomersByEmail for exact-match lookups, and
  // takes priority over the listing page's own filters/pagination — the two
  // callers never combine both in a single request.
  if (emailIn.length > 0) {
    return { items: mockCustomers.filter((customer) => emailIn.includes(customer.email.toLowerCase())), totalItems: 0 };
  }

  const name = getStringParam(params, "name").trim().toLowerCase();
  const email = getStringParam(params, "email").trim().toLowerCase();
  const originChannelIds = getStringParam(params, "origin_channel_id:in")
    .split(",")
    .filter((value) => value !== "")
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value));
  const sortColumnHash = getStringParam(params, "sort") || "name";
  const sortDirection = getStringParam(params, "direction") === "DESC" ? "DESC" : "ASC";
  const currentPage = getNumberParam(params, "page", 1);
  const itemsPerPage = getNumberParam(params, "perPage", 10);

  const filtered = mockCustomers.filter((customer) => {
    if (name && !getFullName(customer).toLowerCase().includes(name)) {
      return false;
    }

    if (email && !customer.email.toLowerCase().includes(email)) {
      return false;
    }

    if (originChannelIds.length > 0 && !originChannelIds.includes(customer.originChannelId)) {
      return false;
    }

    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortColumnHash === "name") {
      const comparison = getFullName(a).localeCompare(getFullName(b));

      return sortDirection === "ASC" ? comparison : -comparison;
    }

    const sortKey = sortColumnHash as keyof Customer;
    const aValue = a[sortKey];
    const bValue = b[sortKey];

    if (typeof aValue === "number" && typeof bValue === "number") {
      return sortDirection === "ASC" ? aValue - bValue : bValue - aValue;
    }

    const comparison = String(aValue).localeCompare(String(bValue));

    return sortDirection === "ASC" ? comparison : -comparison;
  });

  const startIndex = (currentPage - 1) * itemsPerPage;
  const items = sorted.slice(startIndex, startIndex + itemsPerPage);

  return { items, totalItems: sorted.length };
}

export const customersListMockHandler: MockRouteHandler = {
  pattern: new RegExp(`^${CUSTOMERS_PATH}$`),
  handle: (_match, params) => handleCustomersListRequest(params),
};
