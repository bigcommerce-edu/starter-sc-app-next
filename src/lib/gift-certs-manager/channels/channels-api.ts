// @cache-components-only:start
import { cacheLife, cacheTag } from "next/cache";
// @cache-components-only:end
import { getRestApiClient } from "@/lib/bc-api-client/get-rest-api-client";
import { V3ListResponse } from "@/lib/bc-api-client/rest-client/types";
// @cache-components-only:drop-specifier cacheProfile
import { cacheProfile, CACHE_PROFILE_EXTENDED } from "@/lib/cache/cache-profiles";
import { CHANNELS_PATH, Channel } from "@/lib/gift-certs-manager/channels/types";

export interface ChannelsResult {
  items: Channel[];
}

// Lists every channel on the store; callers needing a subset filter the
// result themselves. Channels change far less often than gift certificates
// or customers, so this uses the longer "extended" profile.
export async function fetchChannels(storeHash: string | undefined): Promise<ChannelsResult> {
  // @cache-components-only:start
  "use cache: remote";
  cacheLife(cacheProfile(CACHE_PROFILE_EXTENDED));
  cacheTag("channels:list");
  // @cache-components-only:end

  const apiClient = await getRestApiClient(storeHash);
  const { data: body } = await apiClient.get<V3ListResponse<Channel>>(CHANNELS_PATH, {
  });

  return { items: body.data };
}
