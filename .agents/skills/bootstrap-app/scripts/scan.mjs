#!/usr/bin/env node
// Reports what's left of the example after remove.mjs (and again after
// bootstrap.mjs): imports that no longer resolve, and lines still mentioning
// the example. Read-only and safe to re-run as often as needed.
//
// Usage (from the repo root):
//   node .agents/skills/bootstrap-app/scripts/scan.mjs

import {
  EXAMPLE_MODULE_DIRS,
  SCAN_DIRS,
  SCAN_ROOT_FILES,
  STRONG_KEYWORDS,
  WEAK_KEYWORDS,
  exists,
  importSpecifiers,
  read,
  resolveSpecifier,
  sourceFiles,
} from "./shared.mjs";

const files = [...SCAN_DIRS.flatMap((dir) => sourceFiles(dir)), ...SCAN_ROOT_FILES.filter(exists)];

const brokenImports = [];
const strongHits = [];
const weakHits = [];

for (const file of files) {
  const content = read(file);

  if (/\.(tsx?|mts|mjs)$/.test(file)) {
    for (const specifier of importSpecifiers(content)) {
      if (resolveSpecifier(file, specifier) === null) {
        brokenImports.push(`${file}: ${specifier}`);
      }
    }
  }

  content.split("\n").forEach((line, index) => {
    const entry = `${file}:${index + 1}: ${line.trim()}`;

    if (STRONG_KEYWORDS.test(line)) {
      strongHits.push(entry);
    } else if (WEAK_KEYWORDS.test(line)) {
      weakHits.push(entry);
    }
  });
}

const remainingExampleDirs = EXAMPLE_MODULE_DIRS.filter(exists);

function section(title, lines) {
  console.log(`\n## ${title} (${lines.length})`);
  console.log(lines.length ? lines.map((line) => `  ${line}`).join("\n") : "  (none)");
}

console.log("[bootstrap-app] Example-code scan");
section("Example directories still present", remainingExampleDirs);
section("Unresolvable imports", brokenImports);
section("Strong mentions (almost certainly example leftovers)", strongHits);
section("Weak mentions (customer/channel — often generic, use judgment)", weakHits);
