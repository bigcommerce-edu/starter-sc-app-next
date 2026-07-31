import { channelsMockHandlers } from "@/lib/gift-certs-manager/channels/mock/handlers";
import { customersMockHandlers } from "@/lib/gift-certs-manager/customers/mock/handlers";
import { giftCertificatesMockHandlers } from "@/lib/gift-certs-manager/gift-certificates/mock/handlers";
import { MockRouteHandler } from "@/lib/bc-api-client/rest-client/mock-rest-client/types";

// The only place that wires a feature's mock handlers into MockRestApiClient.
// To drop a demo feature (e.g. gift certificates) from the mock client,
// remove its import and array entry here — MockRestApiClient itself never
// needs to change.
export const mockRouteHandlers: MockRouteHandler[] = [
  ...channelsMockHandlers,
  ...customersMockHandlers,
  ...giftCertificatesMockHandlers,
];
