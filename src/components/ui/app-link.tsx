"use client";

import NextLink from "next/link";
import styled from "styled-components";

// next/link for real prefetching and client-side in-app navigation, with
// BigDesign's Link visual styling (color/weight/hover-active transitions)
// copied on top so it's a drop-in replacement visually. BigDesign's own Link
// stays in use for genuinely external destinations (mailto:, tel:,
// target="_blank" — see developer-info-panel.tsx).
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
