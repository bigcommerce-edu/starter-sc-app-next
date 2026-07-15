"use client";

import NextLink from "next/link";
import styled from "styled-components";

// BigDesign's own Link (@bigcommerce/big-design) renders a plain <a> with no
// router awareness at all — it's a styled-components wrapper around
// ComponentPropsWithoutRef<'a'>, nothing more. That's fine for genuinely
// external destinations (mailto:, tel:, target="_blank" links — see
// developer-info-panel.tsx, which keeps using it directly), but every
// in-app link was going through it too, which is why clicking one was
// always a full browser page load rather than a client-side transition:
// BigDesign's Link was never going to intercept that click regardless of
// what it rendered.
//
// This is the in-app counterpart: next/link for real prefetching and
// client-side navigation, with BigDesign's exact visual styling
// (color/weight/hover-active transitions) copied on top so switching a call
// site from Link to AppLink is a no-op visually. Copied rather than
// re-exported because BigDesign doesn't export its internal StyledLink —
// only the assembled Link component — so this is the smallest surface that
// doesn't reach into BigDesign's unexported internals. If BigDesign's own
// Link styling changes in a future version bump, this copy won't pick it up
// automatically; that's an acceptable, one-time cost for real navigation.
export const AppLink = styled(NextLink)`
  color: ${({ theme }) => theme.colors.primary};
  cursor: pointer;
  font-size: ${({ theme }) => theme.typography.fontSize.medium};
  font-weight: ${({ theme }) => theme.typography.fontWeight.regular};
  text-decoration: none;

  &:active {
    color: ${({ theme }) => theme.colors.primary70};
  }

  &:hover:not(:active) {
    color: ${({ theme }) => theme.colors.primary70};
  }
`;
