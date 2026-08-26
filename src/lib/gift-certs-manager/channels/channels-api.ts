import { getRestApiClient } from "@/lib/bc-api-client/get-rest-api-client";
import { V3ListResponse } from "@/lib/bc-api-client/rest-client/types";
import { CHANNELS_PATH, Channel } from "@/lib/gift-certs-manager/channels/types";

export interface ChannelsResult {
  items: Channel[];
}

// Lists every channel on the store; callers needing a subset filter the
// result themselves.
export async function fetchChannels(storeHash: string | undefined): Promise<ChannelsResult> {
  const apiClient = await getRestApiClient(storeHash);
  const { data: body } = await apiClient.get<V3ListResponse<Channel>>(CHANNELS_PATH);

  return { items: body.data };
}
