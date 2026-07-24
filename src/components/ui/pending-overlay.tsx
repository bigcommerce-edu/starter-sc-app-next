import { Box, Flex, ProgressCircle } from "@/components/ui/big-design";

// Dims already-rendered content and overlays a spinner while isPending is
// true — shows a "refreshing" state for content re-fetched via router.push,
// which doesn't re-trigger a parent <Suspense> fallback since the subtree
// stays mounted.
//
// The overlay node is always mounted (only its visibility toggles) rather
// than conditionally rendered: mounting/unmounting a sibling of children
// while children is mid-transition causes a "removeChild: not a child of
// this node" React DOM crash. This is also why the *Filters component (with
// its own portal-rendered Modal) is nested inside this wrapper rather than
// rendered as a sibling — it needs to stay inside the one subtree
// guaranteed to remain mounted throughout the transition.
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
