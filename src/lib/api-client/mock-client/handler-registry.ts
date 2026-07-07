import { customersMockHandlers } from "@/lib/customers/mock/handlers";
import { giftCertificatesMockHandlers } from "@/lib/gift-certificates/mock/handlers";
import { MockRouteHandler } from "@/lib/api-client/mock-client/types";

// The only place that wires a feature's mock handlers into MockApiClient.
// To drop a demo feature (e.g. gift certificates) from the mock client,
// remove its import and array entry here — MockApiClient itself never
// needs to change.
export const mockRouteHandlers: MockRouteHandler[] = [...customersMockHandlers, ...giftCertificatesMockHandlers];
