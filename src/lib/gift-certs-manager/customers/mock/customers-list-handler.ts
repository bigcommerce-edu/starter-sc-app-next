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

// Exported so customers-api.ts can call it directly in MOCK mode, the same
// way it calls a real REST endpoint in every other mode.
export function handleCustomersListRequest(params: ApiRequestParams): V3ListResponse<CustomerWireRecord> {
  const idIn = getStringParam(params, "id:in")
    .split(",")
    .filter((value) => value !== "")
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value));

  // id:in is used by fetchCustomer for single-record lookups and takes
  // priority over the listing page's own filters/pagination — the two
  // callers never combine both in a single request.
  if (idIn.length > 0) {
    const matches = mockCustomers.filter((customer) => idIn.includes(customer.id));

    return paginate(matches, 1, Math.max(matches.length, 1));
  }

  const nameLike = getStringParam(params, "name:like").trim().toLowerCase();
  const emailFilter = getStringParam(params, "email:in").trim().toLowerCase();
  const dateCreatedMin = getStringParam(params, "date_created:min");
  const dateCreatedMax = getStringParam(params, "date_created:max");

  // sort is a single value with the direction embedded, e.g. "first_name:asc"
  // — BigCommerce supports first_name, last_name and date_created here (see
  // SORT_FIELD in customers-api.ts). The field is read, not just the
  // direction, so this mock orders rows the same way the real endpoint would
  // rather than always sorting by one field.
  const [sortFieldRaw, sortDirectionRaw] = getStringParam(params, "sort").split(":");
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

    // Comparing only the date portion (not the full ISO datetime) keeps
    // both bounds inclusive of their boundary day.
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
    const comparison =
      sortFieldRaw === "date_created"
        ? a.date_created.localeCompare(b.date_created)
        : sortFieldRaw === "last_name"
          ? a.last_name.localeCompare(b.last_name)
          : a.first_name.localeCompare(b.first_name);

    return sortDirection === "ASC" ? comparison : -comparison;
  });

  return paginate(sorted, currentPage, itemsPerPage);
}

export const customersListMockHandler: MockRouteHandler = {
  pattern: new RegExp(`^${CUSTOMERS_PATH}$`),
  handle: (_match, params): MockRouteResponse => ({ data: handleCustomersListRequest(params) }),
};
