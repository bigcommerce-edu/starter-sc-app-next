import { customersListMockHandler } from "@/lib/customers/mock/customers-list-handler";
import { MockRouteHandler } from "@/lib/api-client/mock-client/types";

// The list of mock handlers this feature contributes to MockApiClient.
// Delete this file's import from handler-registry.ts to drop customer
// lookups out of the mock client entirely.
export const customersMockHandlers: MockRouteHandler[] = [customersListMockHandler];
