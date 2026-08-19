"use server";

import { clearSession } from "@/lib/session/session-cookie";
// Imported from data-mode.ts rather than resolve-store-credentials.ts so
// this action doesn't transitively pull in the credentials store just to
// read one env var — see data-mode.ts.
import { getDataMode } from "@/lib/bc-api-client/data-mode";

// Server Action invoked by BigCommerceControlPanelSync when BigCommerce's
// JS SDK reports the admin logged out of the control panel — possibly from
// a different tab, so this app's own iframe may never be interacted with
// again. Dropping the cookie here means the next request from this browser
// is unauthenticated and gets sent back through /load to re-authenticate.
//
// Deliberately takes no arguments and trusts nothing from the caller: it
// only ever clears the caller's own cookie, so there's no store hash or user
// id to validate and nothing an attacker gains by POSTing it (the worst case
// is logging yourself out). That's why there's no isAuthorizedForStore check
// here, unlike the mutating actions in gift-certs/[id]/actions.ts.
//
// Errors are swallowed rather than reported: this is a fire-and-forget
// security cleanup with no UI to surface a failure to, and the session's own
// TTL (see session-jwt.ts) remains the backstop if the write fails.
export async function logoutFromControlPanel(): Promise<void> {
  // MOCK/STATIC have no real session cookie to clear — isAuthorizedForStore
  // passes unconditionally in those modes, so clearing would be a no-op that
  // only risks throwing.
  if (getDataMode() !== "MULTITENANT") {
    return;
  }

  try {
    await clearSession();
  } catch {
    // Nothing actionable client-side; the session TTL still bounds exposure.
  }
}
