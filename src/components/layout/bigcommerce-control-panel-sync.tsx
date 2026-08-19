"use client";

import { useEffect } from "react";
import Script from "next/script";
import { logoutFromControlPanel } from "@/lib/session/logout";

const BC_SDK_SRC = "https://cdn.bigcommerce.com/jssdk/bc-sdk.js";

// The SDK's initialization surface: it reads window.bcAsyncInit once it
// loads, then Bigcommerce.init() registers whichever synchronization
// callbacks the app opts into. Declared here rather than in a global .d.ts
// since this is the only module that touches either global.
//
// Typed with just the options this app actually passes. The SDK is a
// postMessage bridge to the parent control panel frame, so it may grow (or
// already carry, undocumented) other options; add them here as they're
// adopted rather than typing a speculative surface.
declare global {
  interface Window {
    bcAsyncInit?: () => void;
    Bigcommerce?: {
      init: (options: { onLogout?: () => void }) => void;
    };
  }
}

// Loads BigCommerce's JS SDK, which exists to keep an app "synchronized with
// the control panel" — the app runs in an iframe, so control panel state
// changes are otherwise invisible to it. Including the SDK is the documented
// way to subscribe to those events. See
// https://docs.bigcommerce.com/developer/docs/integrations/apps/guide/following-best-practices#manage-user-session-timeouts.
//
// This is the single place that mounts the SDK for the app, so it's where any
// further control panel synchronization belongs as it's adopted. Today the
// app opts into one event:
//
//   - onLogout: the admin logged out of the control panel, possibly from a
//     different tab this iframe would never hear about. Handled by clearing
//     this app's own session cookie, so it can't outlive the control panel
//     session that authorized it.
//
// Client-side by necessity: these signals only exist in the browser, so this
// is the one place the App Router architecture needs an event handler
// bridging a browser event back to a Server Action.
//
// Rendered from the store layout so it's mounted for every store-scoped
// page. Renders no markup — it exists purely for the subscription.
export function BigCommerceControlPanelSync() {
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
