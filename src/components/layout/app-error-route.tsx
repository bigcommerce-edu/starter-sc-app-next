import { Box, Flex, H1, Panel, Text } from "@/components/ui/big-design";
import { ErrorIcon } from "@/components/ui/big-design-icons";
import { AppErrorReason } from "@/lib/bc-auth/app-error-reason";

// Fixed, human-written copy per reason — never the underlying error's own
// message. /auth and /load resolve one of these server-side (via
// StoreNotInstalledError/isSignedPayloadVerificationError/
// TokenExchangeFailedError/InstallSaveFailedError) before redirecting here;
// this file is the one place that decides what a merchant actually sees, so
// the messaging can be reused/changed without touching either route.
//
// /auth's reasons (TOKEN_EXCHANGE_FAILED, INSTALL_SAVE_FAILED,
// INSTALL_FAILED) deliberately never say "reopen the app" — the install
// never completed, so there's no existing installation to reopen; the only
// real next step is attempting the install again from the Marketplace.
// /load's reasons (NOT_INSTALLED, INVALID_SESSION, LOAD_FAILED) can say
// "reopen," since by definition the store was successfully installed at
// some point for /load to have been called at all.
const MESSAGES: Record<AppErrorReason, { header: string; body: string }> = {
  NOT_INSTALLED: {
    header: "App not installed",
    body: "This store doesn't have the app installed yet. Install it from the BigCommerce App Marketplace, or reinstall it if it was recently removed.",
  },
  INVALID_SESSION: {
    header: "Session expired",
    body: "Your session with BigCommerce could not be verified. Close this app and reopen it from your BigCommerce control panel.",
  },
  TOKEN_EXCHANGE_FAILED: {
    header: "Installation failed",
    body: "BigCommerce could not verify this installation request. Try installing the app again from the BigCommerce App Marketplace. If this keeps happening, contact support.",
  },
  INSTALL_SAVE_FAILED: {
    header: "Installation failed",
    body: "The app could not finish saving this installation. Try installing the app again from the BigCommerce App Marketplace. If this keeps happening, contact support.",
  },
  INSTALL_FAILED: {
    header: "Installation failed",
    body: "The app could not be installed for this store. Try installing it again from the BigCommerce App Marketplace. If this keeps happening, contact support.",
  },
  LOAD_FAILED: {
    header: "Something went wrong",
    body: "An unexpected error occurred while loading the app. Try closing and reopening it from your BigCommerce control panel. If this keeps happening, contact support.",
  },
};

// Rendered by app/app-error/page.tsx, which /auth and /load redirect to on
// failure instead of returning a JSON response — BigCommerce navigates the
// merchant's iframe directly to those routes (they're not fetch()ed by our
// own frontend), so a JSON body just renders as raw text with no framing.
// A dedicated top-level route (outside both (root) and [storeHash], same
// reasoning as UnauthorizedStoreRoute/app/unauthorized) since neither
// layout's AppShell chrome is appropriate for a failure that happened
// before the app ever established a session for this store.
export function AppErrorRoute({ reason }: { reason: AppErrorReason }) {
  const { header, body } = MESSAGES[reason];

  return (
    <Flex justifyContent="center" paddingVertical="xxxLarge">
      <Box style={{ maxWidth: "560px", width: "100%" }}>
        <Panel>
          <Flex flexDirection="column" alignItems="center" marginBottom="medium">
            <ErrorIcon color="danger50" size="xLarge" />
            <H1 marginTop="small" marginBottom="none">
              {header}
            </H1>
          </Flex>
          <Text marginBottom="none">{body}</Text>
        </Panel>
      </Box>
    </Flex>
  );
}
