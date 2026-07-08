import { getApiClient } from "@/lib/api-client/get-api-client";
import { V3ListResponse } from "@/lib/api-client/types";
import { CHANNELS_PATH, Channel } from "@/lib/gift-certs-manager/channels/types";

export interface ChannelsResult {
  items: Channel[];
}

// Lists every channel on the store. Unlike customers/gift certificates,
// there's no filtering here — callers that need a subset (e.g. by id) filter
// the result themselves. No sort param either: BigCommerce does not document
// one for this endpoint.
export async function fetchChannels(): Promise<ChannelsResult> {
  const apiClient = getApiClient();
  const response = await apiClient.get<V3ListResponse<Channel>>(CHANNELS_PATH);

  return { items: response.data };
}
