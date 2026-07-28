"use client";

import { MouseEvent } from "react";
import styled from "styled-components";
import { OpenInNewIcon } from "@/components/ui/big-design-icons";
import { getControlPanelUrl } from "@/lib/routing/control-panel-url";

// Same visual styling as AppLink, so this reads as the same kind of control
// elsewhere in the app, plus inline-flex layout so the icon sits next to the
// text.
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
// this app's own iframe, for links to a native control-panel page this app
// doesn't reimplement. Renders a real <a href> (so middle-click/open-in-new-
// tab/copy-link keep working) but intercepts a plain click to navigate
// window.top instead: an iframe's JS can't read/write a cross-origin parent
// frame's properties, but assigning window.top.location is still allowed.
//
// Gates on storeHash being defined (rather than getDataMode(), unreadable in
// a Client Component) — the same signal main-nav.tsx uses, since storeHash
// is only undefined client-side on the root-level MOCK/STATIC dev routes.
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
