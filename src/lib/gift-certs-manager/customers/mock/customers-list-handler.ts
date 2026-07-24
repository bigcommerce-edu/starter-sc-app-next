import { MockRouteHandler, MockRouteResponse } from "@/lib/bc-api-client/rest-client/mock-rest-client/types";
import { ApiRequestParams, V3ListResponse } from "@/lib/bc-api-client/rest-client/types";
import { CustomerWireRecord } from "@/lib/gift-certs-manager/customers/customers-api";
import { mockCustomers } from "@/lib/gift-certs-manager/customers/mock/mock-customers";
import { CUSTOMERS_PATH } from "@/lib/gift-certs-manager/customers/types";

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
  const idIn = getStringParam(params, "id:in")
    .split(",")
    .filter((value) => value !== "")
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value));

  // id:in is used by fetchCustomer for single-record lookups (BigCommerce's
  // v3 customers endpoint has no dedicated /{id} path), and takes priority
  // over the listing page's own filters/pagination — the two callers never
  // combine both in a single request.
  if (idIn.length > 0) {
    const matches = mockCustomers.filter((customer) => idIn.includes(customer.id));

    return paginate(matches, 1, Math.max(matches.length, 1));
  }

  const nameLike = getStringParam(params, "name:like").trim().toLowerCase();
  const emailFilter = getStringParam(params, "email:in").trim().toLowerCase();
  const dateCreatedMin = getStringParam(params, "date_created:min");
  const dateCreatedMax = getStringParam(params, "date_created:max");

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

    // dateCreatedMin/Max are plain dates (e.g. "2024-01-05"), but
    // customer.date_created is a full ISO datetime — comparing the two
    // directly as strings would make :max exclude the entire boundary day
    // (any same-day record has a later, "greater" datetime string than the
    // bare date), which reads as "before this day" rather than the more
    // natural "up to and including this day." Comparing only the date
    // portion of date_created keeps both bounds inclusive of their
    // respective boundary day.
    const customerDateCreated = customer.date_created.slice(0, 10);

    if (dateCreatedMin && customerDateCreated < dateCreatedMin) {
      return false;
    }

    if (dateCreatedMax && customerDateCreated > dateCreatedMax) {
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
  handle: (_match, params): MockRouteResponse => ({ data: handleCustomersListRequest(params) }),
};
