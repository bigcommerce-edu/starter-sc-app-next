import { MockRouteHandler } from "@/lib/api-client/mock-client/types";
import { CHANNELS_PATH, ChannelsResult } from "@/lib/channels/types";
import { mockChannels } from "@/lib/channels/mock/mock-channels";

function handleChannelsListRequest(): ChannelsResult {
  return { items: mockChannels };
}

export const channelsListMockHandler: MockRouteHandler = {
  pattern: new RegExp(`^${CHANNELS_PATH}$`),
  handle: () => handleChannelsListRequest(),
};
