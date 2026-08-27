export const CHANNELS_PATH = "/v3/channels";

// Subset of the BigCommerce v3 channel resource fields this app uses.
export interface Channel {
  id: number;
  name: string;
}
