"use client";

import { MouseEvent } from "react";
import styled from "styled-components";
import { OpenInNewIcon } from "@/components/ui/big-design-icons";
import { getControlPanelUrl } from "@/lib/routing/control-panel-url";

// Same visual styling as AppLink (in turn copied from BigDesign's own Link —
// see its comment), so a ControlPanelLink reads as the same kind of control
// everywhere else in the app, plus an inline-flex layout so the icon sits
// next to the text — the same layout BigDesign's own Link uses for its
// external prop.
const StyledControlPanelLink = styled.a`
  align-items: center;
  color: ${({ theme }) => theme.colors.primary};
  cursor: pointer;
  display: inline-flex;
  font-size: ${({ theme }) => theme.typography.fontSize.medium};
  font-weight: ${({ theme }) => theme.typography.fontWeight.regular};
  gap: ${({ theme }) => theme.spacing.xxSmall};
  text-decoration: none;

  &:active {
    color: ${({ theme }) => theme.colors.primary70};
  }

  &:hover:not(:active) {
    color: ${({ theme }) => theme.colors.primary70};
  }
`;

// Navigates the parent frame (the BigCommerce control panel itself), not
// this app's own iframe — for links that take the merchant to a native
// control-panel page this app doesn't (and shouldn't try to) reimplement.
// Always targets store-<hash>.mybigcommerce.com (see getControlPanelUrl).
//
// This can't be a next/link (AppLink) — it never does an in-app client-side
// transition, and next/link's own prefetch/router wiring has no meaning for
// a navigation that's leaving this app entirely. It renders a real <a href>
// (so middle-click/open-in-new-tab/copy-link keep working) but intercepts a
// plain click to navigate window.top instead of this iframe: an iframe's JS
// can't read or write anything in a cross-origin parent frame (window.parent
// property/method access throws), but assigning window.top.location is
// still allowed — browsers permit top-level navigation from a frame even
// when they block script access to the frame's other properties.
//
// Paired with OpenInNewIcon — the same icon BigDesign's own Link uses for
// its `external` prop — as the visual signal that this ejects from the app,
// consistent with the rest of the app's existing "leaving the current
// context" convention rather than introducing a new one.
//
// Only meaningful in MULTITENANT mode — a store-<hash>.mybigcommerce.com
// control panel only exists for a real store, so this renders nothing
// otherwise. getDataMode() itself isn't readable here (it reads
// process.env.DATA_MODE, a server-only env var unavailable in a Client
// Component), so this gates on storeHash being defined instead — the same
// signal main-nav.tsx and gift-certificate-actions-menu.tsx already use,
// since storeHash is only ever undefined client-side on the root-level
// MOCK/STATIC dev routes (see main-nav.tsx).
export function ControlPanelLink({
  storeHash,
  path,
  children,
}: {
  storeHash: string | undefined;
  path: string;
  children: React.ReactNode;
}) {
  if (!storeHash) {
    return null;
  }

  const href = getControlPanelUrl(storeHash, path);

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    // Only intercept a plain left click — modifier-clicks (middle-click,
    // cmd/ctrl-click, etc.) should keep the browser's native "open in new
    // tab/window" behavior, which needs the real href to still be there.
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }

    event.preventDefault();
    window.top!.location.href = href;
  };

  return (
    <StyledControlPanelLink href={href} onClick={handleClick} rel="noopener noreferrer">
      {children}
      <OpenInNewIcon size="medium" />
    </StyledControlPanelLink>
  );
}
