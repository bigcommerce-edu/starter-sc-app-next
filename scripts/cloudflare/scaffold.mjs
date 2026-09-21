// TODO: Move the Cloudflare deployment tooling behind an opt-in scaffold
// command, the way the Vercel tooling already is — so a learner starting from
// this app isn't carrying Workers-specific config they haven't asked for.
//
// TODO: Add the Cloudflare dependencies and the deployment scripts to
// package.json, rather than shipping them in it.
//
// TODO: Write open-next.config.ts and the example config files from templates,
// so the developer fills in their own account's values.
//
// TODO: Install the Cloudflare-specific D1 driver loader over the placeholder
// one, since obtaining a D1 binding only works on Workers.
//
// TODO: Rename the proxy module to the name Next records in its middleware
// manifest, so the authorization gate is bundled into the Worker.
//
// TODO: Run the cache implementation swap and turn Cache Components off,
// since they can't run on Workers.
