import { channelsListMockHandler } from "@/lib/gift-certs-manager/channels/mock/channels-list-handler";
import { MockRouteHandler } from "@/lib/api-client/mock-client/types";

// The list of mock handlers this feature contributes to MockApiClient.
// Delete this file's import from handler-registry.ts to drop channel
// lookups out of the mock client entirely.
export const channelsMockHandlers: MockRouteHandler[] = [channelsListMockHandler];
