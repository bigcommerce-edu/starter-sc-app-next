#!/usr/bin/env node
// Entry point for opting a checkout into a specific hosting target's
// deployment tooling (package.json scripts, provider-specific config files,
// a .env.<profile>.example listing what production needs set). Nothing here
// runs unless a dev explicitly invokes it — the app itself has no idea which
// hosting profile (if any) has been scaffolded, and works the same either
// way (see e.g. get-credentials-store.ts, which only ever reads
// CREDENTIALS_STORE_DRIVER from the environment). Add a new profile by
// dropping a scaffold(): Promise<void> export in scripts/<profile>/scaffold.mjs
// and registering its name below.
const PROFILES = ["vercel"];

const profile = process.argv[2];

if (!profile || !PROFILES.includes(profile)) {
  console.log(`Usage: pnpm scaffold <profile>\n\nAvailable profiles: ${PROFILES.join(", ")}`);
  process.exit(profile ? 1 : 0);
}

const { scaffold } = await import(`./${profile}/scaffold.mjs`);

await scaffold();
