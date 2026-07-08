import { MockRouteHandler } from "@/lib/api-client/mock-client/types";
import { ApiRequestParams } from "@/lib/api-client/types";
import { V3ListResponse } from "@/lib/api-client/types";
import { CustomerWireRecord } from "@/lib/customers/customers-api";
import { mockCustomers } from "@/lib/customers/mock/mock-customers";
import { CUSTOMERS_PATH } from "@/lib/customers/types";

function getStringParam(params: ApiRequestParams, key: string): string {
  const value = params[key];

  return typeof value === "string" ? value : "";
}

function getNumberParam(params: ApiRequestParams, key: string, fallback: number): number {
  const value = Number(params[key]);

  return Number.isInteger(value) && value > 0 ? value : fallback;
}

function getFullName(customer: CustomerWireRecord): string {
  return `${customer.first_name} ${customer.last_name}`;
}

function paginate(
  items: CustomerWireRecord[],
  currentPage: number,
  itemsPerPage: number,
): V3ListResponse<CustomerWireRecord> {
  const startIndex = (currentPage - 1) * itemsPerPage;
  const data = items.slice(startIndex, startIndex + itemsPerPage);

  return {
    data,
    meta: {
      pagination: {
        total: items.length,
        count: data.length,
        per_page: itemsPerPage,
        current_page: currentPage,
        total_pages: Math.max(1, Math.ceil(items.length / itemsPerPage)),
      },
    },
  };
}

function handleCustomersListRequest(params: ApiRequestParams): V3ListResponse<CustomerWireRecord> {
  const emailIn = getStringParam(params, "email:in")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email !== "");

  // email:in is used by fetchCustomersByEmail for exact-match lookups, and
  // takes priority over the listing page's own filters/pagination — the two
  // callers never combine both in a single request.
  if (emailIn.length > 0) {
    const matches = mockCustomers.filter((customer) => emailIn.includes(customer.email.toLowerCase()));

    return paginate(matches, 1, Math.max(matches.length, 1));
  }

  const nameLike = getStringParam(params, "name:like").trim().toLowerCase();
  const emailFilter = getStringParam(params, "email:in").trim().toLowerCase();
  const originChannelIds = getStringParam(params, "origin_channel_id:in")
    .split(",")
    .filter((value) => value !== "")
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value));

  // sort is a single value with the direction embedded, e.g. "last_name:asc"
  // — the only field BigCommerce supports sorting customers by is last_name
  // (also date_created/date_modified, which this mock doesn't model).
  const [, sortDirectionRaw] = getStringParam(params, "sort").split(":");
  const sortDirection = sortDirectionRaw === "desc" ? "DESC" : "ASC";

  const currentPage = getNumberParam(params, "page", 1);
  const itemsPerPage = getNumberParam(params, "limit", 10);

  const filtered = mockCustomers.filter((customer) => {
    if (nameLike && !getFullName(customer).toLowerCase().includes(nameLike)) {
      return false;
    }

    if (emailFilter && customer.email.toLowerCase() !== emailFilter) {
      return false;
    }

    if (originChannelIds.length > 0 && !originChannelIds.includes(customer.origin_channel_id)) {
      return false;
    }

    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    const comparison = getFullName(a).localeCompare(getFullName(b));

    return sortDirection === "ASC" ? comparison : -comparison;
  });

  return paginate(sorted, currentPage, itemsPerPage);
}

export const customersListMockHandler: MockRouteHandler = {
  pattern: new RegExp(`^${CUSTOMERS_PATH}$`),
  handle: (_match, params) => handleCustomersListRequest(params),
};
