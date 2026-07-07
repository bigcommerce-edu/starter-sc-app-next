import { getApiClient } from "@/lib/api-client/get-api-client";
import { CUSTOMERS_PATH, CustomersResult } from "@/lib/customers/types";

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
