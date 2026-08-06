import { getRestApiClient } from "@/lib/bc-api-client/get-rest-api-client";
import { V3ListResponse } from "@/lib/bc-api-client/rest-client/types";
import { CUSTOMERS_PATH, Customer, CustomersQuery } from "@/lib/gift-certs-manager/customers/types";

export interface CustomersResult {
  items: Customer[];
}

export interface CustomersListResult {
  items: Customer[];
  totalItems: number;
}

// BigCommerce's wire channel_ids is nullable; store_credit_amounts is only
// present at all when the request passes include=storecredit (every fetch
// below does). Every other field on Customer already matches the wire
// response as-is, so these are the only normalizations needed to match the
// Customer shape.
export interface CustomerWireRecord extends Omit<Customer, "channel_ids" | "store_credit_amounts"> {
  channel_ids: number[] | null;
  store_credit_amounts?: Array<{ amount: string }>;
}

function parseCustomer(record: CustomerWireRecord): Customer {
  return { ...record, channel_ids: record.channel_ids ?? [], store_credit_amounts: record.store_credit_amounts ?? [] };
}

// Looks up registered customer accounts by email — this data isn't returned
// by the gift certificates endpoint itself. Caching lives in the calling
// *View component, not here.
export async function fetchCustomersByEmail(
  emails: string[],
  storeHash: string | undefined,
): Promise<CustomersResult> {
  const uniqueEmails = [...new Set(emails.filter((email) => email))];

  if (uniqueEmails.length === 0) {
    return { items: [] };
  }

  const apiClient = await getRestApiClient(storeHash);
  const { data: body } = await apiClient.get<V3ListResponse<CustomerWireRecord>>(CUSTOMERS_PATH, {
    params: {
      "email:in": uniqueEmails.join(","),
      include: "storecredit",
    },
  });

  return { items: body.data.map(parseCustomer) };
}

// BigCommerce's v3 customers endpoint sorts by last_name, not "name" — this
// is the one place that translates the UI's Name column to the real field.
const SORT_FIELD: Record<CustomersQuery["sortColumn"], string> = {
  name: "last_name",
  date_created: "date_created",
};

// query.date_created_max is a bare yyyy-MM-dd date (see customer-filters.tsx),
// but BigCommerce's v3 endpoint compares date_created:max against a full
// timestamp — sent as-is, it'd be read as that day's midnight and exclude
// every customer created later that same day. Appending the end of day
// keeps it inclusive of the whole selected day, matching the mock's
// date-only comparison (see customers-list-handler.ts) so MOCK and
// MULTITENANT agree on what "before this day" means. date_created:min needs
// no such adjustment — midnight is already the inclusive start of that day.
function toEndOfDayTimestamp(date: string): string {
  return `${date}T23:59:59Z`;
}

// BigCommerce's v3 endpoint uses suffix-operator filters (:like/:in) and a
// single sort value with direction embedded (e.g. "last_name:asc").
export async function fetchCustomers(
  query: CustomersQuery,
  storeHash: string | undefined,
): Promise<CustomersListResult> {
  const apiClient = await getRestApiClient(storeHash);
  const { data: body } = await apiClient.get<V3ListResponse<CustomerWireRecord>>(CUSTOMERS_PATH, {
    params: {
      ... (query.name && { "name:like": query.name }),
      ... (query.email && { "email:in": query.email }),
      ... (query.date_created_min && { "date_created:min": query.date_created_min }),
      ... (query.date_created_max && { "date_created:max": toEndOfDayTimestamp(query.date_created_max) }),
      sort: `${SORT_FIELD[query.sortColumn]}:${query.direction.toLowerCase()}`,
      page: query.page,
      limit: query.limit,
      include: "storecredit",
    },
  });

  return { items: body.data.map(parseCustomer), totalItems: body.meta.pagination.total };
}

// No single-resource path in BigCommerce's v3 API — GET
// /v3/customers?id:in={id} is the documented way to fetch one by id. A
// missing id is a list filtered to zero rows, not a 404, so this returns
// undefined rather than deciding what "not found" means — see CustomerView
// for the notFound() translation.
export async function fetchCustomer(id: number | string, storeHash: string | undefined): Promise<Customer | undefined> {
  const apiClient = await getRestApiClient(storeHash);
  const { data: body } = await apiClient.get<V3ListResponse<CustomerWireRecord>>(CUSTOMERS_PATH, {
    params: { "id:in": id, include: "storecredit" },
  });

  const record = body.data[0];

  return record ? parseCustomer(record) : undefined;
}

export function addToCustomerStoreCredit(): void {
  // TODO: grant store credit to a customer
  //  - BigCommerce's v3 customers PUT is a bulk endpoint (array of updates
  //    keyed by id), but only id is required per item; store_credit_amounts
  //    is append-only, BigCommerce sums the store's existing entries plus
  //    this new one on the next fetch
  //  - customer.store_credit_amounts is read from an earlier fetch, not one
  //    taken here - this has the same lost-update shape as the gift
  //    certificate transfer race documented in docs/ARCHITECTURE.md: if
  //    another grant to this same customer completes in between, this PUT's
  //    array is built from a stale snapshot and silently drops that other
  //    entry. Flagged rather than fixed, since BigCommerce's v3 customers PUT
  //    has no optimistic-concurrency precondition either
  //  - throw AppError("NOT_FOUND", ...) if the PUT response has no matching
  //    record
}
