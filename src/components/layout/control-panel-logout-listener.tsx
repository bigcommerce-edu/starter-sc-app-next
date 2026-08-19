"use client";

import { useEffect } from "react";
import Script from "next/script";
import { logoutFromControlPanel } from "@/lib/session/logout";

const BC_SDK_SRC = "https://cdn.bigcommerce.com/jssdk/bc-sdk.js";

// The SDK's only documented surface: it reads window.bcAsyncInit once it
// loads, then calls the registered onLogout whenever the admin logs out of
// the control panel. Declared here rather than in a global .d.ts since this
// is the only module that touches either global.
declare global {
  interface Window {
    bcAsyncInit?: () => void;
    Bigcommerce?: {
      init: (options: { onLogout?: () => void }) => void;
    };
  }
}

// Listens for a control-panel logout via BigCommerce's JS SDK and clears
// this app's own session cookie in response, so the app doesn't keep an
// authenticated session alive after the admin has logged out of BigCommerce
// — including from a different control panel tab, which this app's iframe
// would otherwise never hear about. See
// https://docs.bigcommerce.com/developer/docs/integrations/apps/guide/following-best-practices#manage-user-session-timeouts.
//
// Client-side by necessity: the logout signal only exists in the browser, so
// this is the one place the App Router architecture needs an event handler
// bridging a browser event back to a Server Action (logoutFromControlPanel).
//
// Rendered from the store layout so it's mounted for every store-scoped
// page. Renders no markup — it exists purely for the subscription.
export function ControlPanelLogoutListener() {
  useEffect(() => {
    // Assigned before the script loads (Script below is what triggers the
    // load) so the SDK finds it on init. If the SDK somehow loaded first,
    // the fallback in onLoad covers that ordering instead.
    window.bcAsyncInit = () => {
      window.Bigcommerce?.init({
        onLogout: () => {
          // Fire-and-forget: the action swallows its own errors and there's
          // no UI to update, so nothing here awaits or handles a result.
          void logoutFromControlPanel();
        },
      });
    };

    return () => {
      delete window.bcAsyncInit;
    };
  }, []);

  return (
    <Script
      // afterInteractive rather than beforeInteractive: this is a
      // cross-origin script whose only job is a background subscription, so
      // it must not block the app shell's first paint inside the control
      // panel iframe.
      strategy="afterInteractive"
      src={BC_SDK_SRC}
      // Covers the race where the script finishes loading before the effect
      // above assigned bcAsyncInit — in that case the SDK already missed the
      // hook, so init is invoked directly here instead.
      onLoad={() => window.bcAsyncInit?.()}
    />
  );
}
