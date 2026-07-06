import { ReactNode } from "react";
import { getDataMode } from "@/lib/api-client/get-api-client";
import { UnauthorizedRootRoute } from "@/components/layout/unauthorized-root-route";

// Root-level routes (outside the [storeHash] segment) only exist as a
// convenience for MOCK/STATIC development, where a request has no store
// context. In MULTITENANT mode every real request is scoped to a store hash,
// so hitting a root-level route means the URL is missing that segment —
// render a warning instead of the real page content.
export function renderRootRoute(children: ReactNode): ReactNode {
  const dataMode = getDataMode();

  if (dataMode === "MULTITENANT") {
    return <UnauthorizedRootRoute />;
  }

  return children;
}
