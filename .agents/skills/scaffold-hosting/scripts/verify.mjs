#!/usr/bin/env node
// Read-only post-run checks for `pnpm scaffold <profile>` or a standalone cache
// swap. Prints PASS/WARN/FAIL lines and exits 1 if anything FAILed. Lint and
// typecheck are run separately (see SKILL.md), since a scaffold that adds
// dependencies needs `pnpm install` first.
//
// Usage (from the repo root):
//   node .agents/skills/scaffold-hosting/scripts/verify.mjs --profile <profile>
//
// Profiles are registered in profiles/manifest.json.

import { analyze, formatFinding } from "./analyze.mjs";
import { profileFromArgs } from "./profiles.mjs";

const profile = profileFromArgs(process.argv, "verify.mjs --profile <profile>");
const result = analyze(process.cwd(), profile.name);
const lines = [];
let failed = false;

function check(level, message) {
  if (level === "FAIL") {
    failed = true;
  }

  lines.push(`${level.padEnd(4)} ${message}`);
}

function checkSwap({ allowCacheComponentsOn }) {
  const { state, reasons, markerRegions, useCacheLines, manifestApplied, manifestTotal } = result.cacheState;
  const swappedButFlagOn =
    result.cacheComponents === true && markerRegions === 0 && useCacheLines === 0 && manifestApplied === manifestTotal;

  if (state === "swapped") {
    check("PASS", `Caching is fully swapped to fetch level (${manifestApplied}/${manifestTotal} manifest fetches cached).`);
  } else if (allowCacheComponentsOn && swappedButFlagOn) {
    check("WARN", "Swapped, but cacheComponents is still true in next.config.ts — Cache Components is on with no boundaries to use.");
  } else {
    check("FAIL", `Caching state is "${state}", not "swapped": ${reasons.join("; ")}`);
  }

  const leftovers = result.findings.filter((finding) => finding.code === "U1" || finding.code === "U2");

  if (leftovers.length === 0) {
    check("PASS", "No Cache Components code left anywhere under src/.");
  }

  leftovers.forEach((finding) => check("FAIL", formatFinding(finding)));

  result.findings
    .filter((finding) => finding.code === "U5")
    .forEach((finding) => check("WARN", `Manifest no longer matches the source: ${formatFinding(finding)}`));

  result.findings
    .filter((finding) => finding.code === "U6")
    .forEach((finding) => check("WARN", formatFinding(finding)));

  result.mixed.sites.forEach((site) =>
    check("WARN", `Hand-written fetch caching outside the manifest (kept as-is): ${site.file}:${site.line} ${site.text}`),
  );
}

if (profile.swapsCache) {
  checkSwap({ allowCacheComponentsOn: !profile.disablesCacheComponents });
}

profile.checks.verify?.(result.scaffolds[profile.name], check);

console.log(`[scaffold-hosting] Verify for profile: ${profile.name}\n`);
console.log(lines.join("\n"));
console.log(`\n[scaffold-hosting] ${failed ? "FAILED" : "Passed"}${failed ? "" : " (review any WARN lines)"}.`);
process.exit(failed ? 1 : 0);
