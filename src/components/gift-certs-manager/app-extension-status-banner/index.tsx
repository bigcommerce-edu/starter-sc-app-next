"use client";

import { useEffect, useState, useTransition } from "react";
import { useParams } from "next/navigation";
import { Box, InlineMessage } from "@/components/ui/big-design";
import { showErrorAlert, showSuccessAlert } from "@/components/ui/action-alerts";
import { retryAppExtensionRegistration } from "@/components/gift-certs-manager/app-extension-status-banner/actions/retry-app-extension-registration";

// null = still checking (render nothing rather than flash the banner then
// hide it), true = registered (render nothing), false = confirmed missing
// (render the banner).
type RegistrationStatus = boolean | null;

// Whether the App Extension is registered is a cosmetic diagnostic, not
// something any page render should block on, so this fetches its own status
// client-side via an internal API route rather than awaiting it server-side.
// storeHash is read via useParams() rather than a prop, so AppShell never
// needs to await route params just to pass a value only this component uses.
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
        // no-store: this URL never changes even though its result can, so
        // the browser's default HTTP caching would otherwise keep serving a
        // stale response invisibly to server-side cacheTag/updateTag.
        const response = await fetch(url, { cache: "no-store" });

        if (!response.ok) {
          return;
        }

        const { isRegistered } = (await response.json()) as { isRegistered: boolean };

        if (isCurrent) {
          setStatus(isRegistered);
        }
      } catch {
        // If the status check fails, the banner just doesn't render — the
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
        showSuccessAlert(result.message);
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
