import { cacheLife, cacheTag } from "next/cache";
import { getDataMode } from "@/lib/bc-api-client/data-mode";
import { getRestApiClient } from "@/lib/bc-api-client/get-rest-api-client";
import { V3ListResponse } from "@/lib/bc-api-client/rest-client/types";
import { handleChannelsListRequest } from "@/lib/gift-certs-manager/channels/mock/channels-list-handler";
import { CHANNELS_PATH, Channel } from "@/lib/gift-certs-manager/channels/types";

export interface ChannelsResult {
  items: Channel[];
}

// Lists every channel on the store; callers needing a subset filter the
// result themselves. Channels change far less often than gift certificates
// or customers, so this uses the longer "extended" cacheLife rather than the
// "standard" lifetime the calling view uses for its own data. Only MOCK mode
// is implemented so far — it calls the mock handler directly, the same data
// a real endpoint would return.
export async function fetchChannels(storeHash: string | undefined): Promise<ChannelsResult> {
  "use cache: remote";
  cacheLife("extended");
  cacheTag("channels:list");

  if (getDataMode() === "MOCK") {
    return { items: handleChannelsListRequest().data };
  }

  const apiClient = await getRestApiClient(storeHash);
  const { data: body } = await apiClient.get<V3ListResponse<Channel>>(CHANNELS_PATH);

  return { items: body.data };
}
