"use client";

import { useEffect, useState, useTransition } from "react";
import { useParams } from "next/navigation";
import { Box } from "@/components/ui/box";
import { InlineMessage } from "@/components/ui/inline-message";
import { showErrorAlert, showSuccessAlert } from "@/components/ui/action-alerts";
import { retryAppExtensionRegistration } from "@/components/gift-certs-manager/app-extension-status-banner/actions/retry-app-extension-registration";

// null = still checking (render nothing rather than flash the banner then
// hide it), true = registered (render nothing), false = confirmed missing
// (render the banner).
type RegistrationStatus = boolean | null;

// Whether this app's App Extension is registered is not something any page
// render should ever block on — it's a cosmetic diagnostic, not something
// that affects whether the app actually works — so this fetches its own
// status client-side via an internal API route (see
// app/api/internal/app-extension-status/route.ts) rather than being a
// Server Component that awaits the lookup itself. storeHash is read via
// useParams() rather than taken as a prop, for the same reason MainNav
// does: so AppShell (a Server Component) never needs to await route params
// just to pass a value only this client component uses.
export function AppExtensionStatusBanner() {
  const params = useParams<{ storeHash?: string }>();
  const storeHash = params.storeHash;
  const [status, setStatus] = useState<RegistrationStatus>(null);
  const [isRetrying, startRetry] = useTransition();

  useEffect(() => {
    let isCurrent = true;

    async function checkStatus() {
      try {
        const url = storeHash
          ? `/api/internal/app-extension-status?storeHash=${encodeURIComponent(storeHash)}`
          : "/api/internal/app-extension-status";
        const response = await fetch(url);

        if (!response.ok) {
          return;
        }

        const { isRegistered } = (await response.json()) as { isRegistered: boolean };

        if (isCurrent) {
          setStatus(isRegistered);
        }
      } catch {
        // No further handling: if the status check itself fails, the
        // banner just doesn't render — same as "registered," which is the
        // safer default for a purely cosmetic diagnostic.
      }
    }

    checkStatus();

    return () => {
      isCurrent = false;
    };
  }, [storeHash]);

  if (status !== false) {
    return null;
  }

  const handleRetry = () => {
    startRetry(async () => {
      const result = await retryAppExtensionRegistration(storeHash);

      if (result.success) {
        setStatus(true);
        showSuccessAlert("App extension registration succeeded");
      } else {
        showErrorAlert(result.message);
      }
    });
  };

  return (
    <Box paddingHorizontal="large" paddingTop="large">
      <InlineMessage
        actions={[{ text: "Retry", onClick: handleRetry, isLoading: isRetrying }]}
        header="App extension registration failed"
        messages={[
          {
            text: "The \"Manage Gift Certificates\" menu shortcut could not be added to the customer detail page.",
          },
        ]}
        type="warning"
      />
    </Box>
  );
}
