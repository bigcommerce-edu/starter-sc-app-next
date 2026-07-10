import { cacheLife, cacheTag } from "next/cache";
import { getApiClient } from "@/lib/api-client/get-api-client";
import { StoreCredentials } from "@/lib/api-client/store-credentials";
import { V3ListResponse } from "@/lib/api-client/types";
import { CHANNELS_PATH, Channel } from "@/lib/gift-certs-manager/channels/types";

export interface ChannelsResult {
  items: Channel[];
}

// Lists every channel on the store. Unlike customers/gift certificates,
// there's no filtering here — callers that need a subset (e.g. by id) filter
// the result themselves. No sort param either: BigCommerce does not document
// one for this endpoint. Channels change far less often than gift
// certificates or customers, so this keeps its own `use cache` boundary
// (nested inside whichever *View calls it) with the longer "extended"
// cacheLife (see next.config.ts), rather than inheriting the shorter
// "standard" lifetime the calling view uses for its own data.
export async function fetchChannels(apiCredentials: StoreCredentials): Promise<ChannelsResult> {
  "use cache";
  cacheLife("extended");
  cacheTag("channels:list");

  const apiClient = getApiClient(apiCredentials);
  const { data: body } = await apiClient.get<V3ListResponse<Channel>>(CHANNELS_PATH);

  return { items: body.data };
}
