import { getApiClient } from "@/lib/api-client/get-api-client";
import { CHANNELS_PATH, ChannelsResult } from "@/lib/channels/types";

// Lists every channel on the store. Unlike customers/gift certificates,
// there's no filtering here — callers that need a subset (e.g. by id) filter
// the result themselves.
export async function fetchChannels(): Promise<ChannelsResult> {
  const apiClient = getApiClient();

  return apiClient.get<ChannelsResult>(CHANNELS_PATH);
}
