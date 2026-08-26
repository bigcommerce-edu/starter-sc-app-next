// Read-only analysis shared by preflight.mjs, verify.mjs, and rehearse.mjs.
// Never writes a file.
//
// Self-contained on purpose: it reads scripts/cache-swap/fetch-cache-manifest.json
// and scans src/ with the same line-based rules the swap uses, rather than
// importing swap-to-fetch-caching.mjs (which exports only the mutating entry
// point). The cost is that the rules below mirror the swap's by hand — when
// they disagree with that script, the script wins, and this file should be
// updated to match.
//
// Provider-specific checks live in profiles/, registered in
// profiles/manifest.json (see profiles.mjs).

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { git, readJson } from "./shared.mjs";
import { getProfile, PROFILES } from "./profiles.mjs";

const MANIFEST = "scripts/cache-swap/fetch-cache-manifest.json";

const MARKER_START = "@cache-components-only:start";
const MARKER_END = "@cache-components-only:end";
const MARKER_DROP_SPECIFIER = "@cache-components-only:drop-specifier";

// The swap's own leftover list (see findLeftovers in swap-to-fetch-caching.mjs).
// `updateTag` is deliberately absent there too: it works under both
// implementations.
const CACHE_COMPONENTS_ONLY_API = ['"use cache', "cacheLife(", "cacheTag("];

// Fetch-level caching written by hand, outside the manifest. Each survives the
// swap untouched; under Cache Components it caches a second time, underneath
// whatever `use cache` boundary is around it.
const FETCH_CACHING_PATTERNS = [
  { pattern: /\bcache:\s*\{\s*profile:\s*(?!CACHE_PROFILE_NONE\b)[A-Za-z_$]/, label: "REST client `cache:` option" },
  { pattern: /\bnext:\s*\{[^}]*\brevalidate\b/, label: "fetch `next.revalidate` option" },
  { pattern: /["']force-cache["']/, label: "fetch `force-cache`" },
  { pattern: /\bunstable_cache\b/, label: "`unstable_cache`" },
];

// The module that implements toFetchCacheOptions() legitimately contains
// `next: { revalidate`, so it's excluded from the hand-written-caching scan.
const FETCH_CACHING_EXCLUDED_DIRS = ["src/lib/cache"];

// ===== Helpers =====

function toPosix(relativePath) {
  return relativePath.split(path.sep).join("/");
}

function isUnder(relativePath, dir) {
  return relativePath === dir || relativePath.startsWith(`${dir}/`);
}

function isCommentLine(line) {
  const trimmed = line.trim();

  return trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*");
}

function collectSourceFiles(root, dir) {
  const absolute = path.join(root, dir);

  if (!existsSync(absolute)) {
    return [];
  }

  const found = [];

  for (const entry of readdirSync(absolute)) {
    const relative = toPosix(path.join(dir, entry));

    if (statSync(path.join(root, relative)).isDirectory()) {
      found.push(...collectSourceFiles(root, relative));
    } else if (entry.endsWith(".ts") || entry.endsWith(".tsx")) {
      found.push(relative);
    }
  }

  return found;
}

// ===== Markers =====

// Replays the swap's removal pass without writing: which lines it would drop,
// and which marker mistakes would make it throw. Rules match
// removeCacheComponentsCode() / dropImportSpecifier() in the swap.
function parseMarkers(lines, relativePath) {
  const inRegion = new Array(lines.length).fill(false);
  const errors = [];
  let regionCount = 0;
  let depth = 0;
  let pendingDrop;

  for (const [index, line] of lines.entries()) {
    const trimmed = line.trim();

    if (trimmed.endsWith(MARKER_START) && trimmed.startsWith("//")) {
      depth += 1;
      regionCount += 1;
      inRegion[index] = true;
      continue;
    }

    if (trimmed.endsWith(MARKER_END) && trimmed.startsWith("//")) {
      depth -= 1;
      inRegion[index] = true;

      if (depth < 0) {
        errors.push({ line: index + 1, message: `${MARKER_END} with no matching ${MARKER_START}` });
        depth = 0;
      }

      continue;
    }

    if (trimmed.includes(MARKER_DROP_SPECIFIER)) {
      pendingDrop = { specifier: trimmed.split(/\s+/).pop(), line: index + 1 };
      continue;
    }

    if (depth > 0) {
      inRegion[index] = true;
      continue;
    }

    if (pendingDrop && trimmed.startsWith("import ")) {
      const specifier = pendingDrop.specifier;
      const droppable =
        new RegExp(`\\{\\s*${specifier}\\s*,`).test(line) || new RegExp(`,\\s*${specifier}\\s*\\}`).test(line);

      if (!droppable) {
        errors.push({
          line: index + 1,
          message: `drop-specifier marker on line ${pendingDrop.line} names "${specifier}", which this import can't drop (it must be one of several specifiers)`,
        });
      }

      pendingDrop = undefined;
    }
  }

  if (depth > 0) {
    errors.push({ line: lines.length, message: `${depth} unclosed ${MARKER_START} marker(s)` });
  }

  if (pendingDrop) {
    errors.push({ line: pendingDrop.line, message: "drop-specifier marker not followed by an import" });
  }

  return { inRegion, regionCount, errors, relativePath };
}

// ===== Function scopes =====

// Top-level function declarations and their line ranges, by brace depth — the
// same deliberately simple approach as the swap's findFunctionRange(). Only
// unindented declarations count, so nested helpers resolve to their enclosing
// top-level function.
function findTopLevelFunctions(lines) {
  const declaration = /^(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)/;
  const functions = [];

  for (let start = 0; start < lines.length; start += 1) {
    const match = lines[start].match(declaration);

    if (!match) {
      continue;
    }

    let depth = 0;
    let seenBody = false;

    for (let index = start; index < lines.length; index += 1) {
      for (const character of lines[index]) {
        if (character === "{") {
          depth += 1;
          seenBody = true;
        } else if (character === "}") {
          depth -= 1;
        }
      }

      if (seenBody && depth === 0) {
        functions.push({ name: match[1], start, end: index });
        start = index;
        break;
      }
    }
  }

  return functions;
}

// The swap anchors a manifest entry on the *first* line matching this, at any
// indentation (findFunctionRange in the swap).
function findManifestFunctionRange(lines, functionName) {
  const declaration = new RegExp(`^\\s*(?:export\\s+)?(?:async\\s+)?function\\s+${functionName}\\b`);
  const start = lines.findIndex((line) => declaration.test(line));

  if (start === -1) {
    return undefined;
  }

  let depth = 0;
  let seenBody = false;

  for (let index = start; index < lines.length; index += 1) {
    for (const character of lines[index]) {
      if (character === "{") {
        depth += 1;
        seenBody = true;
      } else if (character === "}") {
        depth -= 1;
      }
    }

    if (seenBody && depth === 0) {
      return { start, end: index };
    }
  }

  return undefined;
}

function linesIn(lines, range) {
  return lines.slice(range.start, range.end + 1);
}

// ===== Tags =====

// Pulls the argument text out of each `cacheTag(...)` on a line, balancing
// parentheses so `cacheTag(customerTag(id))` yields `customerTag(id)`.
function extractCacheTagArguments(line) {
  const results = [];
  let searchFrom = 0;

  while (true) {
    const at = line.indexOf("cacheTag(", searchFrom);

    if (at === -1) {
      return results;
    }

    let depth = 0;
    let index = at + "cacheTag".length;

    for (; index < line.length; index += 1) {
      if (line[index] === "(") {
        depth += 1;
      } else if (line[index] === ")") {
        depth -= 1;

        if (depth === 0) {
          break;
        }
      }
    }

    results.push(line.slice(at + "cacheTag(".length, index).trim());
    searchFrom = index;
  }
}

// Reduces a tag expression to what the manifest can be compared on: an
// identifier, the name of a tag-builder function, or a string literal.
// Template literals are "dynamic" — no manifest entry could name them.
function normalizeTag(expression) {
  if (/^[A-Za-z_$][\w$]*$/.test(expression)) {
    return { kind: "identifier", key: expression };
  }

  const call = expression.match(/^([A-Za-z_$][\w$]*)\s*\(/);

  if (call) {
    return { kind: "builder", key: call[1] };
  }

  const literal = expression.match(/^(["'])(.*)\1$/);

  if (literal) {
    return { kind: "literal", key: literal[2] };
  }

  return { kind: "dynamic", key: expression };
}

function manifestTagKeys(manifest) {
  const keys = new Set();

  for (const entry of manifest.fetchCaching ?? []) {
    for (const tag of entry.tags ?? []) {
      keys.add(normalizeTag(tag).key);
    }

    for (const constant of entry.declareConstants ?? []) {
      keys.add(constant.name);
      keys.add(constant.value);
    }
  }

  for (const entry of manifest.invalidations ?? []) {
    for (const [builder, listTag] of Object.entries(entry.companionTags ?? {})) {
      keys.add(builder);
      keys.add(listTag);
    }
  }

  return keys;
}

// ===== Manifest validation =====

// Each check here is one the swap makes only *after* its removal pass has
// already rewritten files — so any failure means a half-swapped tree.
function validateManifest(root, manifest, profileExports) {
  const problems = [];
  const applied = [];

  for (const dir of manifest.searchDirs ?? []) {
    if (!existsSync(path.join(root, dir))) {
      problems.push({ file: MANIFEST, message: `searchDirs entry does not exist: ${dir}` });
    }
  }

  for (const entry of manifest.fetchCaching ?? []) {
    const label = `${entry.file} › ${entry.function}`;

    if (!existsSync(path.join(root, entry.file))) {
      problems.push({ file: MANIFEST, message: `fetchCaching entry points at a missing file: ${entry.file}` });
      continue;
    }

    if (profileExports && !profileExports.has(entry.profile)) {
      problems.push({ file: MANIFEST, message: `${label}: profile ${entry.profile} is not exported by src/lib/cache/cache-profiles.ts` });
    }

    const lines = readFileSync(path.join(root, entry.file), "utf8").split("\n");
    const range = findManifestFunctionRange(lines, entry.function);

    if (!range) {
      problems.push({ file: entry.file, message: `no top-level function "${entry.function}" (renamed or removed?)` });
      continue;
    }

    const getLines = [];

    for (let index = range.start; index <= range.end; index += 1) {
      if (/apiClient\.get</.test(lines[index])) {
        getLines.push(index);
      }
    }

    if (getLines.length !== 1) {
      problems.push({
        file: entry.file,
        line: range.start + 1,
        message: `"${entry.function}" contains ${getLines.length} apiClient.get calls; the manifest needs exactly one`,
      });
      continue;
    }

    const callLine = getLines[0];

    if (!lines[callLine].trimEnd().endsWith("{")) {
      problems.push({
        file: entry.file,
        line: callLine + 1,
        message: `the apiClient.get call in "${entry.function}" has no trailing options object for the swap to add to`,
      });
      continue;
    }

    const next = lines[callLine + 1] ?? "";

    if (next.includes("cache: {")) {
      if (new RegExp(`profile:\\s*${entry.profile}\\b`).test(next)) {
        applied.push(entry);
      } else {
        // The swap treats any `cache: {` here as already applied and skips the
        // entry, so a different option silently wins over the manifest.
        problems.push({
          file: entry.file,
          line: callLine + 2,
          message: `"${entry.function}" already has a different cache option (${next.trim()}); the swap will skip this entry and keep it`,
        });
      }
    }
  }

  for (const entry of manifest.invalidations ?? []) {
    if (!existsSync(path.join(root, entry.file))) {
      problems.push({ file: MANIFEST, message: `invalidations entry points at a missing file: ${entry.file}` });
    }
  }

  return { problems, applied };
}

function readProfileExports(root) {
  const profilesPath = path.join(root, "src/lib/cache/cache-profiles.ts");

  if (!existsSync(profilesPath)) {
    return undefined;
  }

  const source = readFileSync(profilesPath, "utf8");

  return new Set([...source.matchAll(/export const (CACHE_PROFILE_\w+)/g)].map((match) => match[1]));
}

// ===== Cache-implementation state =====

function readCacheComponents(root) {
  const configPath = path.join(root, "next.config.ts");

  if (!existsSync(configPath)) {
    return null;
  }

  const match = readFileSync(configPath, "utf8").match(/cacheComponents:\s*(true|false)\b/);

  return match ? match[1] === "true" : null;
}

function classifyCacheState({ cacheComponents, markerRegions, useCacheLines, manifestTotal, manifestApplied }) {
  const reasons = [];

  if (cacheComponents === null) {
    return { state: "unknown", reasons: ["next.config.ts has no literal `cacheComponents: true|false` setting"] };
  }

  if (cacheComponents) {
    if (manifestApplied > 0) {
      reasons.push(`${manifestApplied}/${manifestTotal} manifest fetches already carry fetch-level cache options`);
      reasons.push("cacheComponents is still true");

      if (markerRegions > 0) {
        reasons.push(`${markerRegions} @cache-components-only region(s) remain`);
      }

      return { state: "partial", reasons };
    }

    if (markerRegions === 0 && useCacheLines === 0 && manifestTotal > 0) {
      reasons.push("no Cache Components code or markers remain, but no manifest fetch has cache options either");
      reasons.push("cacheComponents is still true");

      return { state: "partial", reasons };
    }

    return { state: "pristine", reasons };
  }

  if (markerRegions > 0 || useCacheLines > 0) {
    reasons.push("cacheComponents is false");

    if (markerRegions > 0) {
      reasons.push(`${markerRegions} @cache-components-only region(s) remain`);
    }

    if (useCacheLines > 0) {
      reasons.push(`${useCacheLines} "use cache" directive(s) remain, which won't build with cacheComponents off`);
    }

    return { state: "partial", reasons };
  }

  if (manifestApplied < manifestTotal) {
    reasons.push(`only ${manifestApplied}/${manifestTotal} manifest fetches carry fetch-level cache options`);

    return { state: "manual-swap", reasons };
  }

  return { state: "swapped", reasons };
}

// ===== Source scan =====

function scanSources(root, manifest) {
  const searchDirs = manifest?.searchDirs ?? [];
  const tagKeys = manifest ? manifestTagKeys(manifest) : new Set();
  const companionBuilders = new Set(
    (manifest?.invalidations ?? []).flatMap((entry) => Object.keys(entry.companionTags ?? {})),
  );
  const invalidationFiles = new Set((manifest?.invalidations ?? []).map((entry) => entry.file));
  const manifestFunctions = new Set((manifest?.fetchCaching ?? []).map((entry) => `${entry.file}#${entry.function}`));

  const findings = [];
  const handWrittenFetchCaching = [];
  let markerRegions = 0;
  let useCacheLines = 0;

  for (const file of collectSourceFiles(root, "src")) {
    const lines = readFileSync(path.join(root, file), "utf8").split("\n");
    const inSearchDirs = searchDirs.some((dir) => isUnder(file, dir));
    const markers = parseMarkers(lines, file);
    const functions = findTopLevelFunctions(lines);
    const enclosing = (index) => functions.find((fn) => index >= fn.start && index <= fn.end);

    markerRegions += markers.regionCount;

    // U5 (marker half): mistakes that make the swap throw mid-run.
    if (inSearchDirs) {
      for (const error of markers.errors) {
        findings.push({ code: "U5", severity: "swap-fails", file, line: error.line, message: error.message });
      }
    }

    // U2: marked regions the swap never looks at.
    if (!inSearchDirs && markers.regionCount > 0) {
      findings.push({
        code: "U2",
        severity: "survives-swap",
        file,
        message: `${markers.regionCount} @cache-components-only region(s) in a file outside the manifest's searchDirs; the swap won't remove them`,
      });
    }

    const cachedFunctions = new Map();

    for (const [index, line] of lines.entries()) {
      if (line.includes('"use cache')) {
        useCacheLines += 1;

        const fn = enclosing(index);

        if (fn) {
          cachedFunctions.set(fn.name, fn);
        } else {
          findings.push({
            code: "U3",
            severity: "possible",
            file,
            line: index + 1,
            message: '"use cache" outside a top-level `function` declaration; the manifest can only anchor fetches in named function declarations',
          });
        }
      }

      // U1: Cache Components API left outside markers. Inside searchDirs the
      // swap's leftover check counts comments too, so they're reported there.
      if (!markers.inRegion[index] && CACHE_COMPONENTS_ONLY_API.some((api) => line.includes(api))) {
        if (inSearchDirs) {
          findings.push({
            code: "U1",
            severity: "swap-fails",
            file,
            line: index + 1,
            message: `unmarked Cache Components code; the swap's leftover check will throw after it has already rewritten files: ${line.trim()}`,
          });
        } else if (!isCommentLine(line)) {
          findings.push({
            code: "U1",
            severity: "survives-swap",
            file,
            line: index + 1,
            message: `unmarked Cache Components code outside searchDirs; the swap won't see it: ${line.trim()}`,
          });
        }
      }

      // Hand-written fetch-level caching.
      if (!markers.inRegion[index] && !isCommentLine(line) && !FETCH_CACHING_EXCLUDED_DIRS.some((dir) => isUnder(file, dir))) {
        for (const { pattern, label } of FETCH_CACHING_PATTERNS) {
          if (pattern.test(line)) {
            const fn = enclosing(index);

            handWrittenFetchCaching.push({
              file,
              line: index + 1,
              label,
              text: line.trim(),
              inManifestFunction: Boolean(fn && manifestFunctions.has(`${file}#${fn.name}`)),
            });
          }
        }
      }

      // U6: a per-record invalidation with no list-tag companion.
      if (!markers.inRegion[index] && !isCommentLine(line)) {
        for (const match of line.matchAll(/\bupdateTag\(\s*([A-Za-z_$][\w$]*)\s*\(/g)) {
          const builder = match[1];

          if (!companionBuilders.has(builder) || !invalidationFiles.has(file)) {
            findings.push({
              code: "U6",
              severity: "possible",
              file,
              line: index + 1,
              message: `updateTag(${builder}(...)) has no manifest companionTags entry here; under fetch caching, listings that include this record won't be invalidated`,
            });
          }
        }
      }
    }

    // U3 / U4: what each cached function will lose when its boundary is removed.
    for (const fn of cachedFunctions.values()) {
      const body = linesIn(lines, fn);
      const restGets = body.filter((line) => /apiClient\.get</.test(line)).length;
      const otherRestGets = body.filter((line) => /\b\w*[Cc]lient\.get\s*[<(]/.test(line) && !/apiClient\.get</.test(line)).length;
      const usesRestClient = body.some((line) => line.includes("getRestApiClient("));
      const usesGraphql = body.some((line) => line.includes("getGraphqlApiClient(") || /\.request\s*[<(]/.test(line));
      const hasEntry = manifestFunctions.has(`${file}#${fn.name}`);
      const location = { file, line: fn.start + 1 };

      if (restGets === 1 && !hasEntry) {
        findings.push({
          code: "U3",
          severity: "caching-lost",
          ...location,
          message: `"${fn.name}" is cached with "use cache" and issues an apiClient.get, but has no fetchCaching manifest entry; it will be uncached after the swap`,
        });
        continue;
      }

      if (restGets > 1 && !hasEntry) {
        findings.push({
          code: "U3",
          severity: "caching-lost",
          ...location,
          message: `"${fn.name}" is cached and issues ${restGets} apiClient.get calls; the manifest can target only one per function, so it needs splitting`,
        });
        continue;
      }

      if (restGets === 0 && usesRestClient && otherRestGets > 0) {
        findings.push({
          code: "U3",
          severity: "caching-lost",
          ...location,
          message: `"${fn.name}" is cached and makes a REST GET, but not through a variable named \`apiClient\`; the swap only matches \`apiClient.get<\``,
        });
        continue;
      }

      if (usesGraphql) {
        findings.push({
          code: "U3",
          severity: "caching-lost",
          ...location,
          message: `"${fn.name}" is cached and makes a GraphQL request; the manifest can only express apiClient.get fetches, so it will be uncached after the swap`,
        });
        continue;
      }

      if (restGets > 0) {
        continue;
      }

      // A boundary with no fetch of its own: compare its tags with the manifest
      // to guess whether the fetch underneath it is covered.
      const tags = body.flatMap(extractCacheTagArguments).map(normalizeTag);
      const uncovered = tags.filter((tag) => tag.kind !== "dynamic" && !tagKeys.has(tag.key));
      const dynamicOnly = tags.length > 0 && tags.every((tag) => tag.kind === "dynamic");

      if (uncovered.length > 0) {
        findings.push({
          code: "U4",
          severity: "possible",
          ...location,
          message: `"${fn.name}" is a cache boundary tagged ${[...new Set(uncovered.map((tag) => tag.key))].join(", ")}, which no manifest entry uses; if it renders data from a fetch, that fetch probably needs a fetchCaching entry`,
        });
      } else if (dynamicOnly) {
        findings.push({
          code: "U4",
          severity: "info",
          ...location,
          message: `"${fn.name}" is a cache boundary with only computed tags and no API fetch of its own; it will simply be uncached after the swap`,
        });
      }
    }
  }

  return { findings, handWrittenFetchCaching, markerRegions, useCacheLines };
}

// ===== Working tree =====

function analyzeWorkingTree(root, paths) {
  const status = git(root, ["status", "--porcelain", "--", ...paths]);

  if (status === undefined) {
    return { isGitRepo: false, dirty: [] };
  }

  return { isGitRepo: true, dirty: status.split("\n").filter(Boolean) };
}

// ===== Entry point =====

// `profile` is a name from profiles/manifest.json. It scopes the working-tree
// check to the paths that profile touches; every profile's own analysis runs
// regardless, so a report can mention a scaffold that was applied earlier.
export function analyze(root = process.cwd(), profile = "cache-swap") {
  let manifest;
  let manifestError;

  try {
    manifest = readJson(root, MANIFEST);
  } catch (error) {
    manifestError = `${MANIFEST}: ${error.message}`;
  }

  const cacheComponents = readCacheComponents(root);
  const profileExports = readProfileExports(root);
  const validation = manifest ? validateManifest(root, manifest, profileExports) : { problems: [], applied: [] };
  const scan = scanSources(root, manifest);

  const findings = [
    ...validation.problems.map((problem) => ({ code: "U5", severity: "swap-fails", ...problem })),
    ...scan.findings,
  ];

  if (manifestError) {
    findings.unshift({ code: "U5", severity: "swap-fails", file: MANIFEST, message: manifestError });
  }

  const cacheState = classifyCacheState({
    cacheComponents,
    markerRegions: scan.markerRegions,
    useCacheLines: scan.useCacheLines,
    manifestTotal: manifest?.fetchCaching?.length ?? 0,
    manifestApplied: validation.applied.length,
  });

  // Under Cache Components every hand-written fetch cache is a second layer.
  // After a swap, the manifest's own options are expected and only the rest
  // are worth mentioning.
  const mixed =
    cacheComponents === true
      ? scan.handWrittenFetchCaching
      : scan.handWrittenFetchCaching.filter((site) => !site.inManifestFunction);

  return {
    root,
    cacheComponents,
    cacheState: {
      ...cacheState,
      markerRegions: scan.markerRegions,
      useCacheLines: scan.useCacheLines,
      manifestTotal: manifest?.fetchCaching?.length ?? 0,
      manifestApplied: validation.applied.length,
      manifestMissing: (manifest?.fetchCaching ?? [])
        .filter((entry) => !validation.applied.includes(entry))
        .map((entry) => `${entry.file} › ${entry.function}`),
    },
    mixed: { underCacheComponents: cacheComponents === true, sites: mixed },
    findings,
    unswappable: findings.filter((finding) => finding.severity !== "info"),
    scaffolds: Object.fromEntries(
      PROFILES.filter(({ checks }) => checks.analyze).map(({ name, checks }) => [
        name,
        checks.analyze(root, { cacheComponents }),
      ]),
    ),
    workingTree: analyzeWorkingTree(root, getProfile(profile).paths),
  };
}

// ===== Report formatting =====

export const SEVERITY_LABELS = {
  "swap-fails": "Swap will fail partway (files already rewritten)",
  "survives-swap": "Survives the swap and breaks the build",
  "caching-lost": "Caching silently dropped by the swap",
  possible: "Possibly unmapped (needs a look)",
  info: "Informational",
};

export function formatFinding(finding) {
  const location = finding.line ? `${finding.file}:${finding.line}` : finding.file;

  return `[${finding.code}] ${location} — ${finding.message}`;
}

export function groupBySeverity(findings) {
  const groups = new Map();

  for (const severity of Object.keys(SEVERITY_LABELS)) {
    const matching = findings.filter((finding) => finding.severity === severity);

    if (matching.length > 0) {
      groups.set(severity, matching);
    }
  }

  return groups;
}
