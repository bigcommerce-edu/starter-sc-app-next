// Loads the hosting profiles registered in profiles/manifest.json.
//
// Each manifest entry describes one profile:
//
//   name                     — the --profile value, and the `pnpm scaffold` argument
//   label                    — display name in reports
//   command                  — what the skill runs for this profile
//   module                   — optional, relative to profiles/: provider-specific checks
//   swapsCache               — whether the profile runs the cache swap
//   disablesCacheComponents  — whether it also sets `cacheComponents: false`
//   paths                    — tracked paths it reads or writes: checked for
//                              uncommitted changes, restored on rollback, staged
//                              on commit
//   creates                  — untracked files it creates: deleted on rollback
//                              (after confirmation), staged on commit
//   commitMessage            — the suggested commit message
//   guide                    — the doc that covers the steps after the scaffold
//
// A profile module exports any of these, all read-only:
//
//   analyze(root, { cacheComponents }) → state, with a `progress` of "none",
//     "partial", or "complete" and anything preflight/verify need
//   preflight(state, { item, needsInput }) — reports how far a previous run
//     got; calls needsInput() when the state needs a decision before running
//   verify(state, check) — calls check("PASS" | "WARN" | "FAIL", message)
//
// Adding a profile means adding an entry here and, for checks beyond the cache
// swap, a module beside the others.

import { readFileSync } from "node:fs";

const MANIFEST_URL = new URL("./profiles/manifest.json", import.meta.url);

export const PROFILES = await Promise.all(
  JSON.parse(readFileSync(MANIFEST_URL, "utf8")).profiles.map(async (profile) => ({
    ...profile,
    checks: profile.module ? await import(new URL(profile.module, MANIFEST_URL)) : {},
  })),
);

export const PROFILE_NAMES = PROFILES.map((profile) => profile.name);

export function getProfile(name) {
  return PROFILES.find((profile) => profile.name === name);
}

// Shared argument handling for preflight.mjs and verify.mjs: exits with usage
// when --profile is missing or unknown.
export function profileFromArgs(argv, usage) {
  const index = argv.indexOf("--profile");
  const profile = index === -1 ? undefined : getProfile(argv[index + 1]);

  if (!profile) {
    console.error(`Usage: ${usage.replace("<profile>", PROFILE_NAMES.join("|"))}`);
    process.exit(1);
  }

  return profile;
}
