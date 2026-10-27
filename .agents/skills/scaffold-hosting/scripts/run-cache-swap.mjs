#!/usr/bin/env node
// Runs only the cache swap (scripts/cache-swap/swap-to-fetch-caching.mjs), for
// a developer who wants fetch-level caching without a hosting scaffold.
//
// The swap itself deliberately leaves `cacheComponents` alone — that flag
// belongs to whatever makes the swap necessary. With --disable-cache-components
// this also sets it to false, the same edit the Cloudflare scaffold makes, so
// the fetch-level implementation is the only one running.
//
// Usage (from the repo root):
//   node .agents/skills/scaffold-hosting/scripts/run-cache-swap.mjs [--disable-cache-components]

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const LOG_PREFIX = "[scaffold-hosting:cache-swap]";
const repoRoot = process.cwd();

function log(message) {
  console.log(`${LOG_PREFIX} ${message}`);
}

const { swapToFetchCaching } = await import(
  pathToFileURL(path.join(repoRoot, "scripts/cache-swap/swap-to-fetch-caching.mjs")).href
);

swapToFetchCaching();

if (process.argv.includes("--disable-cache-components")) {
  const configPath = path.join(repoRoot, "next.config.ts");
  const original = readFileSync(configPath, "utf8");

  if (/cacheComponents:\s*false/.test(original)) {
    log("next.config.ts already has cacheComponents: false — leaving it as-is.");
  } else {
    const updated = original.replace(/cacheComponents:\s*true/, "cacheComponents: false");

    if (updated === original) {
      log("WARNING: could not find a `cacheComponents` setting in next.config.ts. Set it to false by hand.");
    } else {
      writeFileSync(configPath, updated);
      log("Set cacheComponents to false in next.config.ts.");
    }
  }
}
