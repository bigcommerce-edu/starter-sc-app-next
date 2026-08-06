// TODO: Implement ControlPanelLink - navigate the parent frame (the BigCommerce control panel itself),
// not this app's own iframe, for links to a native control-panel page this
// app doesn't reimplement
//  - "use client"
//  - gate on storeHash being defined (rather than getDataMode(), unreadable
//    in a Client Component) - render null when it's undefined, since
//    storeHash is only undefined client-side on the root-level MOCK/STATIC
//    dev routes
//  - styled(a) matching AppLink's visuals, inline-flex so a LogoutIcon can
//    sit next to the text, signalling that the link leaves this app
//  - render a real <a href={getControlPanelUrl(storeHash, path)}> (so
//    middle-click/open-in-new-tab/copy-link keep working), but intercept a
//    plain left click (button === 0, no modifier keys) with
//    preventDefault() + window.top!.location.href = href - an iframe's JS
//    can't read/write a cross-origin parent frame's properties, but
//    assigning window.top.location is still allowed
