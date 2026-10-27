#!/usr/bin/env node
// Read-only preflight for `pnpm scaffold <profile>` or a standalone cache swap.
// Reports the working tree, the caching implementation's current state, any
// custom caching the swap can't handle, and how far a previous scaffold got.
// Detects only; it never proposes or makes a fix.
//
// Usage (from the repo root):
//   node .agents/skills/scaffold-hosting/scripts/preflight.mjs \
//     --profile <profile> [--json]
//
// Profiles are registered in profiles/manifest.json.

import { analyze, formatFinding, groupBySeverity, SEVERITY_LABELS } from "./analyze.mjs";
import { PROFILES, profileFromArgs } from "./profiles.mjs";

const profile = profileFromArgs(process.argv, "preflight.mjs --profile <profile> [--json]");
const json = process.argv.includes("--json");
const result = analyze(process.cwd(), profile.name);
const swaps = profile.swapsCache;
const ownState = result.scaffolds[profile.name];

// Run the profile's own preflight first, so its needsInput() calls count
// toward the verdict. Its lines are printed in their own section below.
const profileItems = [];
let profileNeedsInput = false;

profile.checks.preflight?.(ownState, {
  item: (text) => profileItems.push(text),
  needsInput: () => {
    profileNeedsInput = true;
  },
});

// The scaffold-hosting skill reads `verdict` to decide whether to stop and ask.
//   blocked     — unswappable caching or a broken manifest; ask before scaffolding
//   needs-input — nothing unswappable, but the state needs a decision
//                 (dirty tree, partial swap, mixed caching, overwrite warning)
//   ready       — run the scaffold
function verdict() {
  if (swaps && result.unswappable.length > 0) {
    return "blocked";
  }

  const needsInput =
    result.workingTree.dirty.length > 0 ||
    !result.workingTree.isGitRepo ||
    (swaps && ["partial", "manual-swap", "unknown"].includes(result.cacheState.state)) ||
    (swaps && result.mixed.sites.length > 0) ||
    profileNeedsInput ||
    (!swaps && result.cacheState.state !== "pristine");

  return needsInput ? "needs-input" : "ready";
}

const summary = { profile: profile.name, verdict: verdict(), ...result };

if (json) {
  console.log(JSON.stringify(summary, null, 2));
  process.exit(0);
}

const out = [];
const section = (title) => out.push("", `== ${title} ==`);
const item = (text) => out.push(`  - ${text}`);

out.push(`[scaffold-hosting] Preflight for profile: ${profile.name}`);
out.push(`[scaffold-hosting] Verdict: ${summary.verdict.toUpperCase()}`);

section("Working tree");

if (!result.workingTree.isGitRepo) {
  item("Not a git repository (or git unavailable) — there's no way to roll back a failed scaffold.");
} else if (result.workingTree.dirty.length === 0) {
  item(`Clean under ${profile.paths.join(", ")}.`);
} else {
  item(`${result.workingTree.dirty.length} uncommitted change(s) where the scaffold writes:`);
  result.workingTree.dirty.forEach((line) => out.push(`      ${line}`));
}

section("Caching implementation");
item(`cacheComponents in next.config.ts: ${result.cacheComponents ?? "not found"}`);
item(`State: ${result.cacheState.state}`);
result.cacheState.reasons.forEach((reason) => out.push(`      ${reason}`));
item(
  `${result.cacheState.markerRegions} marker region(s), ${result.cacheState.useCacheLines} "use cache" directive(s), ` +
    `${result.cacheState.manifestApplied}/${result.cacheState.manifestTotal} manifest fetches with cache options`,
);

if (result.cacheState.manifestApplied > 0 && result.cacheState.manifestMissing.length > 0) {
  item("Manifest fetches without cache options:");
  result.cacheState.manifestMissing.forEach((entry) => out.push(`      ${entry}`));
}

if (result.mixed.sites.length > 0) {
  section(result.mixed.underCacheComponents ? "Mixed caching (fetch-level caching under Cache Components)" : "Hand-written fetch-level caching");
  result.mixed.sites.forEach((site) => item(`${site.file}:${site.line} ${site.label} — ${site.text}`));
}

if (swaps) {
  section("Custom caching the swap can't handle");

  if (result.findings.length === 0) {
    item("None found.");
  }

  for (const [severity, findings] of groupBySeverity(result.findings)) {
    out.push(`  ${SEVERITY_LABELS[severity]} (${findings.length}):`);
    findings.forEach((finding) => out.push(`    ${formatFinding(finding)}`));
  }
}

if (ownState) {
  section(`Previous ${profile.label} scaffold: ${ownState.progress}`);
  profileItems.forEach(item);
}

if (!swaps && result.cacheState.state !== "pristine") {
  section("Caching implementation for this profile");
  item(
    `The caching implementation is "${result.cacheState.state}", not Cache Components. Fetch-level caching works for ${profile.label}, ` +
      "but the swap is one-directional — restoring Cache Components means going back through git.",
  );
}

const otherScaffolds = PROFILES.filter(
  (other) => other.name !== profile.name && result.scaffolds[other.name] && result.scaffolds[other.name].progress !== "none",
);

if (otherScaffolds.length > 0) {
  section("Other scaffolds already applied");
  otherScaffolds.forEach((other) =>
    item(`${other.label} (${result.scaffolds[other.name].progress}) — its changes stay in place.`),
  );
}

console.log(out.join("\n"));
