import { cacheLife, cacheTag } from "next/cache";
import { getRestApiClient } from "@/lib/bc-api-client/get-rest-api-client";
import { V3ListResponse } from "@/lib/bc-api-client/rest-client/types";
import { CHANNELS_PATH, Channel } from "@/lib/gift-certs-manager/channels/types";

export interface ChannelsResult {
  items: Channel[];
}

// Lists every channel on the store; callers needing a subset filter the
// result themselves. Channels change far less often than gift certificates
// or customers, so this uses the longer "extended" cacheLife rather than the
// "standard" lifetime the calling view uses for its own data.
export async function fetchChannels(storeHash: string | undefined): Promise<ChannelsResult> {
  "use cache: remote";
  cacheLife("extended");
  cacheTag("channels:list");

  const apiClient = await getRestApiClient(storeHash);
  const { data: body } = await apiClient.get<V3ListResponse<Channel>>(CHANNELS_PATH);

  return { items: body.data };
}
