import { Box, Flex, ProgressCircle } from "@/components/ui/big-design";

// Dims already-rendered content and overlays a spinner while isPending is
// true. Used to show a "refreshing" state for content re-fetched via
// router.push (a soft navigation), which does not re-trigger a parent
// <Suspense> boundary's fallback since the subtree stays mounted.
//
// The overlay node is always mounted (only its visibility toggles) rather
// than being conditionally rendered — mounting/unmounting a sibling of
// children while children itself is mid-transition (its Server Component
// content swapping in) causes React to crash with a "removeChild: not a
// child of this node" DOM reconciliation error. This is also why the
// *Filters component (with its own portal-rendered Modal) is nested inside
// this wrapper rather than rendered as its sibling: AppLink's underlying
// next/link mounts an IntersectionObserver via a ref callback on every row,
// so a table row re-render during that same transition can hit the same
// crash against the filters Modal's portal if the Modal isn't inside the
// one subtree that's guaranteed to stay mounted throughout.
export function PendingOverlay({ isPending, children }: { isPending: boolean; children: React.ReactNode }) {
  return (
    <Box style={{ position: "relative" }}>
      <Flex
        alignItems="center"
        justifyContent="center"
        style={{ position: "absolute", inset: 0, zIndex: 1, visibility: isPending ? "visible" : "hidden" }}
      >
        <ProgressCircle size="small" />
      </Flex>

      <Box style={{ opacity: isPending ? 0.5 : 1, pointerEvents: isPending ? "none" : undefined }}>{children}</Box>
    </Box>
  );
}
