export const CHANNELS_PATH = "/v3/channels";

// Mirrors the subset of the BigCommerce v3 channels resource this app needs.
export interface Channel {
  id: number;
  name: string;
}

export interface ChannelsResult {
  items: Channel[];
}
