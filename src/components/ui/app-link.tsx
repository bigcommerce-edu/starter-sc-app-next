"use client";

import NextLink from "next/link";

// The in-app counterpart to the plain external Link (see link.tsx): next/link
// for real prefetching and client-side navigation, with the same visual
// styling as every other link in the app (see globals.css's .app-link rule,
// shared with Link and ControlPanelLink) so switching a call site between
// them is a no-op visually.
export function AppLink({
  className,
  ...rest
}: React.ComponentProps<typeof NextLink>) {
  return <NextLink {...rest} className={className ? `app-link ${className}` : "app-link"} />;
}
