import { getRestApiClient } from "@/lib/bc-api-client/get-rest-api-client";
import { V3ListResponse } from "@/lib/bc-api-client/rest-client/types";
import { CHANNELS_PATH, Channel } from "@/lib/gift-certs-manager/channels/types";

export interface ChannelsResult {
  items: Channel[];
}

// Channels have no per-record tag: nothing in this app mutates a channel, so
// the shared tag exists only to make the entry addressable if that changes.
const CHANNELS_LIST_TAG = "channels:list";

// Lists every channel on the store; callers needing a subset filter the
// result themselves. Channels change far less often than gift certificates
// or customers, so this uses the longer "extended" profile rather than the
// "standard" lifetime the calling views use for their own data.
export async function fetchChannels(storeHash: string | undefined): Promise<ChannelsResult> {
  const apiClient = await getRestApiClient(storeHash);
  const { data: body } = await apiClient.get<V3ListResponse<Channel>>(CHANNELS_PATH, {
    cache: { profile: "extended", tags: [CHANNELS_LIST_TAG] },
  });

  return { items: body.data };
}
