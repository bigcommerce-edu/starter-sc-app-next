export const CHANNELS_PATH = "/v3/channels";

// Matches the BigCommerce v3 channel resource fields this app uses (a subset
// of the full record — see https://docs.bigcommerce.com/docs/rest-management/channels).
// There's no value-level transformation needed for id/name, so this is the
// same shape on the wire and in the app.
export interface Channel {
  id: number;
  name: string;
}
