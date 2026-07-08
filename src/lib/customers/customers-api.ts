import { getApiClient } from "@/lib/api-client/get-api-client";
import { CUSTOMERS_PATH, Customer, CustomersListResult, CustomersQuery, CustomersResult, getCustomerPath } from "@/lib/customers/types";

// Looks up registered customer accounts by email. Gift certificates (and any
// other feature that only knows an email address) use this to find out
// whether that email belongs to a registered customer, and if so, their
// account details — this data intentionally does not come back from the
// gift certificates endpoint itself.
export async function fetchCustomersByEmail(emails: string[]): Promise<CustomersResult> {
  const uniqueEmails = [...new Set(emails.filter((email) => email))];

  if (uniqueEmails.length === 0) {
    return { items: [] };
  }

  const apiClient = getApiClient();

  return apiClient.get<CustomersResult>(CUSTOMERS_PATH, {
    params: {
      "email:in": uniqueEmails.join(","),
    },
  });
}

// Domain-level adapter for the customers listing page: translates a
// CustomersQuery into the request shape the customers endpoint expects.
export async function fetchCustomers(query: CustomersQuery): Promise<CustomersListResult> {
  const apiClient = getApiClient();

  return apiClient.get<CustomersListResult>(CUSTOMERS_PATH, {
    params: {
      name: query.name,
      email: query.email,
      "origin_channel_id:in": query.originChannelIds.join(","),
      sort: query.sortColumnHash,
      direction: query.sortDirection,
      page: query.currentPage,
      perPage: query.itemsPerPage,
    },
  });
}

export async function fetchCustomer(id: number | string): Promise<Customer> {
  const apiClient = getApiClient();

  return apiClient.get<Customer>(getCustomerPath(id));
}
