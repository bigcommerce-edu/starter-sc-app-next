# Patch: BigDesign `Modal` `removeChild` crash

## Symptom

Intermittently, navigating away from and back to a page with a BigDesign
`Modal` (e.g. the gift certificates list page's filter modal) throws:

```
Uncaught NotFoundError: Failed to execute 'removeChild' on 'Node': The node
to be removed is not a child of this node.
```

Reproduced by: open the gift certificates list page, navigate to a specific
gift certificate, use "Back to Gift Certificates" to return to the list,
then repeat with a different certificate. Which certificate, or how many
repetitions, doesn't matter — only that a fresh instance of the list page
(and therefore a fresh `GiftCertificateFilters`/`Modal` instance) mounts and
unmounts each time.

## Root cause

`@bigcommerce/big-design@3.2.0`'s `Modal` component (`dist/{es,cjs}/components/Modal/Modal.js`)
manages its portal container manually, outside React's own subtree:

```js
useEffect(() => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  setModalContainer(container);
}, []);

useEffect(() => {
  return () => {
    if (modalContainer) {
      document.body.removeChild(modalContainer);
    }
  };
}, [modalContainer]);
```

On mount, it always creates a `<div>` and appends it directly to
`document.body` (regardless of whether the modal is actually open). On
unmount, it removes that exact node — but with no check that the node is
still attached to `document.body` at that point.

This app's navigation pattern (`AppLink`s that push a new route rather than
`router.back()`) means "back" navigation mounts a genuinely new instance of
the list page's component tree on every visit, so a fresh
`GiftCertificateFilters`/`Modal` pairing mounts and unmounts each time.
Combined with React 19's rendering/commit timing (this app runs React 19
against BigDesign's declared React 18 peer dependency — see the
`peerDependencyRules.allowedVersions` override in `pnpm-workspace.yaml`),
an old `Modal` instance's cleanup can fire after its container node has
already been detached some other way, and the unconditional
`removeChild` throws.

## Fix

[`patches/@bigcommerce__big-design+modal-removechild-detached-node.patch`](../patches/@bigcommerce__big-design+modal-removechild-detached-node.patch)
adds a defensive check before removing the container:

```diff
- if (modalContainer) {
+ if (modalContainer && modalContainer.parentNode === document.body) {
    document.body.removeChild(modalContainer);
  }
```

Applied to both the ESM and CJS builds inside the package, since either may
be resolved depending on the bundler/build.

Managed via `pnpm patch` / `pnpm patch-commit`, and registered in
`pnpm-workspace.yaml` under `patchedDependencies`, so it's re-applied
automatically on every `pnpm install` — no manual step is needed to keep it
in place.

## Alongside this patch

A related, but distinct, hazard was also found and fixed directly in this
app's own code (not requiring a patch): row-level `AppLink` components
(`src/components/ui/app-link.tsx`, wrapping `next/link`) attach a callback
ref that mounts/unmounts a link-tracking instance on every row re-render.
When a table's rows re-rendered via `router.push` (from sorting, pagination,
or filtering) while a filters `Modal` lived as a *sibling* rather than
inside the same always-mounted wrapper, the same class of DOM-reconciliation
crash could occur. The fix there was to nest `GiftCertificateFilters` /
`CustomerFilters` inside `PendingOverlay` (see its comments in
`src/components/ui/pending-overlay.tsx`), so nothing that re-renders during
a client-side transition is a sibling of a portal-rendering component.

That fix alone did not resolve the crash described above — this patch was
still required for the back-navigation repro case.

## Revisiting this patch

This can be removed if/when a future `@bigcommerce/big-design` release fixes
`Modal`'s container-removal logic upstream (e.g. adds this same guard, or
switches to a React-managed portal lifecycle). Check the installed
version's `Modal.js` before assuming this patch is still necessary after any
`@bigcommerce/big-design` version bump.
