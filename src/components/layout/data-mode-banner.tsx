import { getDataMode } from "@/lib/api-client/get-api-client";

const DATA_MODE_LABEL: Record<"MOCK" | "STATIC", string> = {
  MOCK: "mock",
  STATIC: "static token",
};

export function DataModeBanner() {
  const dataMode = getDataMode();

  if (dataMode !== "MOCK" && dataMode !== "STATIC") {
    return null;
  }

  return (
    <div style={{ padding: "1rem" }}>
      <p style={{ fontWeight: "bold" }}>{`Data fetching is in ${DATA_MODE_LABEL[dataMode]} mode`}</p>
      <p>All routes are unprotected. Never deploy the app to production in this configuration.</p>
    </div>
  );
}
