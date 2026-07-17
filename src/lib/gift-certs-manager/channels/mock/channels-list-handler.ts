import { MockRouteHandler, MockRouteResponse } from "@/lib/bc-api-client/mock-client/types";
import { V3ListResponse } from "@/lib/bc-api-client/types";
import { CHANNELS_PATH, Channel } from "@/lib/gift-certs-manager/channels/types";
import { mockChannels } from "@/lib/gift-certs-manager/channels/mock/mock-channels";

function handleChannelsListRequest(): V3ListResponse<Channel> {
  return {
    data: mockChannels,
    meta: {
      pagination: {
        total: mockChannels.length,
        count: mockChannels.length,
        per_page: mockChannels.length,
        current_page: 1,
        total_pages: 1,
      },
    },
  };
}

export const channelsListMockHandler: MockRouteHandler = {
  pattern: new RegExp(`^${CHANNELS_PATH}$`),
  handle: (): MockRouteResponse => ({ data: handleChannelsListRequest() }),
};
