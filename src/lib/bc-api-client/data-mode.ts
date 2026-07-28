// Split out of resolve-store-credentials.ts so a caller that only needs the
// current DataMode (e.g. proxy.ts) doesn't transitively pull in the
// credentials store (and with it pg/node:sqlite) just to read one env var —
// that coupling breaks the moment such a caller moves to a runtime (Edge,
// Cloudflare) those drivers can't build for.
export type DataMode = "MOCK" | "STATIC" | "MULTITENANT";

const VALID_DATA_MODES: DataMode[] = ["MOCK", "STATIC", "MULTITENANT"];

export function getDataMode(): DataMode {
  const configuredMode = process.env.DATA_MODE?.toUpperCase();

  return VALID_DATA_MODES.includes(configuredMode as DataMode) ? (configuredMode as DataMode) : "MOCK";
}
