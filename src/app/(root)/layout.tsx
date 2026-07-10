// This route group has no [storeHash] segment (these routes only ever
// render in MOCK/STATIC mode — see root-route-guard.tsx), but layouts don't
// inherit across sibling route groups, so this file still has to exist.
// AppShell resolves storeHash to undefined for a params object with no
// storeHash key, the same as for any other missing/absent route param, which
// is exactly the behavior this route group needs — so it's otherwise
// identical to [storeHash]/layout.tsx.
export { default } from "@/app/[storeHash]/layout";
