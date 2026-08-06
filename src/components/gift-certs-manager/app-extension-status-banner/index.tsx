// TODO: Implement AppExtensionStatusBanner - render a warning banner when this app's App Extension isn't
// registered, with a Retry action
//  - "use client"
//  - a RegistrationStatus state (boolean | null): null = still checking
//    (render nothing rather than flash the banner then hide it), true =
//    registered (render nothing), false = confirmed missing (render the banner)
//  - reads storeHash via useParams() rather than a prop, so AppShell never
//    needs to await route params just to pass a value only this component uses
//  - fetches its own status client-side in a useEffect via
//    fetch("/api/internal/app-extension-status?storeHash=...", { cache:
//    "no-store" }) - this is a cosmetic diagnostic, not something any page
//    render should block on
//  - on Retry, calls retryAppExtensionRegistration(storeHash) inside a
//    useTransition, showing a success/error alert (showSuccessAlert/
//    showErrorAlert) and updating status on success
