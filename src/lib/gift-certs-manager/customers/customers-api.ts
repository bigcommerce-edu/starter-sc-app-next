import { getRestApiClient } from "@/lib/bc-api-client/get-rest-api-client";
import { V3ListResponse } from "@/lib/bc-api-client/types";
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

// Looks up registered customer accounts by email. Gift certificates (and any
// other feature that only knows an email address) use this to find out
// whether that email belongs to a registered customer, and if so, their
// account details — this data intentionally does not come back from the
// gift certificates endpoint itself. Caching lives in the calling *View
// component, not here, so the whole rendered view is cached together. Takes
// storeHash (rather than a BcRestApiClient) and resolves the client itself —
// this function is never itself a `use cache` boundary, so that's just a
// normal function call, not a cache-serialization concern.
export async function fetchCustomersByEmail(
  emails: string[],
  storeHash: string | undefined,
): Promise<CustomersResult> {
  const uniqueEmails = [...new Set(emails.filter((email) => email))];

  if (uniqueEmails.length === 0) {
    return { items: [] };
  }

  const apiClient = getRestApiClient(storeHash);
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

// BigCommerce v3 customers endpoint uses suffix-operator filters (:like/:in)
// and a single sort value with the direction embedded (e.g. "last_name:asc").
// See fetchCustomersByEmail — caching lives in the calling *View component.
export async function fetchCustomers(
  query: CustomersQuery,
  storeHash: string | undefined,
): Promise<CustomersListResult> {
  const apiClient = getRestApiClient(storeHash);
  const { data: body } = await apiClient.get<V3ListResponse<CustomerWireRecord>>(CUSTOMERS_PATH, {
    params: {
      ... (query.name && { "name:like": query.name }),
      ... (query.email && { "email:in": query.email }),
      ... (query.date_created_min && { "date_created:min": query.date_created_min }),
      ... (query.date_created_max && { "date_created:max": query.date_created_max }),
      sort: `${SORT_FIELD[query.sortColumn]}:${query.direction.toLowerCase()}`,
      page: query.page,
      limit: query.limit,
      include: "storecredit",
    },
  });

  return { items: body.data.map(parseCustomer), totalItems: body.meta.pagination.total };
}

// BigCommerce's v3 customers endpoint has no single-resource path (unlike
// gift certificates/channels) — GET /v3/customers?id:in={id} is the
// documented way to fetch one customer by id. See fetchCustomersByEmail —
// caching lives in the calling *View component (CustomerView).
export async function fetchCustomer(id: number | string, storeHash: string | undefined): Promise<Customer> {
  const apiClient = getRestApiClient(storeHash);
  const { data: body } = await apiClient.get<V3ListResponse<CustomerWireRecord>>(CUSTOMERS_PATH, {
    params: { "id:in": id, include: "storecredit" },
  });

  const record = body.data[0];

  if (!record) {
    throw new Error(`No customer found with id "${id}".`);
  }

  return parseCustomer(record);
}

// BigCommerce's v3 customers PUT is a bulk endpoint (an array of updates,
// keyed by id) even though this app only ever updates one customer at a
// time, and only id is actually required per item — unlike gift
// certificates' v2 PUT, there's no need to resend every other field.
// store_credit_amounts is append-only from the caller's perspective: BigCommerce
// collapses the store's existing per-currency entries plus this new one into
// a single summed amount on the next fetch, so the request just adds one
// more entry to the array rather than replacing it.
export async function addToCustomerStoreCredit(
  customer: Customer,
  amount: number,
  storeHash: string | undefined,
): Promise<Customer> {
  const apiClient = getRestApiClient(storeHash);
  const { data: body } = await apiClient.put<V3ListResponse<CustomerWireRecord>>(CUSTOMERS_PATH, {
    body: [
      {
        id: customer.id,
        store_credit_amounts: [...customer.store_credit_amounts, { amount: String(amount) }],
      },
    ],
  });

  const record = body.data[0];

  if (!record) {
    throw new Error(`No customer found with id "${customer.id}".`);
  }

  return parseCustomer(record);
}
