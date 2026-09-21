// Swaps this app's caching from Cache Components (`use cache` boundaries) to
// fetch-level caching, for deployment targets that can't run PPR. Called by a
// hosting profile's scaffold (see scripts/cloudflare/scaffold.mjs); not tied to
// any one target.
//
// Two independent halves:
//
//   Removals  — driven entirely by the @cache-components-only markers in the
//               source. No manifest involvement, so code that only exists
//               under Cache Components can be added or moved freely as long as
//               it stays inside markers.
//   Additions — driven by fetch-cache-manifest.json, which names the profile
//               and tags for each cacheable fetch. That information has no
//               counterpart in the Cache Components source (a `use cache`
//               boundary tags itself in a different file from the fetch it
//               wraps), so it can't be inferred and has to be declared.
//
// Anchors on (file, function) rather than line numbers or call text — several
// fetches in this app are textually identical and distinguishable only by the
// function containing them. A manifest entry that no longer matches is a hard
// error, never a skip: that's what turns a rename into a loud failure instead
// of silently unhandled caching.
//
// See docs/CACHE-IMPLEMENTATION-SWAP.md.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));
const manifestPath = path.join(repoRoot, "scripts/cache-swap/fetch-cache-manifest.json");

const MARKER_START = "@cache-components-only:start";
const MARKER_END = "@cache-components-only:end";
const MARKER_DROP_SPECIFIER = "@cache-components-only:drop-specifier";

const LOG_PREFIX = "[cache-swap]";

function log(message) {
  console.log(`${LOG_PREFIX} ${message}`);
}

function fail(message) {
  throw new Error(`${LOG_PREFIX} ${message}`);
}

// ===== File collection =====

function collectSourceFiles(dir) {
  const absolute = path.join(repoRoot, dir);

  if (!existsSync(absolute)) {
    fail(`searchDirs entry does not exist: ${dir}`);
  }

  const found = [];

  for (const entry of readdirSync(absolute)) {
    const entryPath = path.join(absolute, entry);

    if (statSync(entryPath).isDirectory()) {
      found.push(...collectSourceFiles(path.join(dir, entry)));
    } else if (entry.endsWith(".ts") || entry.endsWith(".tsx")) {
      found.push(path.join(dir, entry));
    }
  }

  return found;
}

// ===== Pass 1: removals (marker-driven) =====

// Drops every marker-delimited region, and applies drop-specifier markers to
// the import line that follows them. Markers nest zero levels deep by
// convention, but the depth counter means an accidental nesting fails the
// balance check below rather than silently truncating the file.
function removeCacheComponentsCode(source, relativePath) {
  const lines = source.split("\n");
  const kept = [];
  let depth = 0;
  let specifierToDrop;

  for (const [index, line] of lines.entries()) {
    const trimmed = line.trim();

    if (trimmed.endsWith(MARKER_START) && trimmed.startsWith("//")) {
      depth += 1;
      continue;
    }

    if (trimmed.endsWith(MARKER_END) && trimmed.startsWith("//")) {
      depth -= 1;

      if (depth < 0) {
        fail(`${relativePath}:${index + 1} has a ${MARKER_END} with no matching ${MARKER_START}.`);
      }

      continue;
    }

    if (trimmed.includes(MARKER_DROP_SPECIFIER)) {
      specifierToDrop = trimmed.split(/\s+/).pop();
      continue;
    }

    if (depth > 0) {
      continue;
    }

    if (specifierToDrop && trimmed.startsWith("import ")) {
      kept.push(dropImportSpecifier(line, specifierToDrop, relativePath, index + 1));
      specifierToDrop = undefined;
      continue;
    }

    kept.push(line);
  }

  if (depth !== 0) {
    fail(`${relativePath} has ${depth} unclosed ${MARKER_START} marker(s).`);
  }

  if (specifierToDrop) {
    fail(`${relativePath} has a ${MARKER_DROP_SPECIFIER} marker not followed by an import.`);
  }

  return collapseBlankRuns(kept).join("\n");
}

function dropImportSpecifier(line, specifier, relativePath, lineNumber) {
  const withoutLeading = line.replace(new RegExp(`\\{\\s*${specifier}\\s*,\\s*`), "{ ");

  if (withoutLeading !== line) {
    return withoutLeading;
  }

  const withoutTrailing = line.replace(new RegExp(`,\\s*${specifier}\\s*\\}`), " }");

  if (withoutTrailing !== line) {
    return withoutTrailing;
  }

  fail(`${relativePath}:${lineNumber} does not import a "${specifier}" specifier to drop.`);
}

// Removing a region usually leaves the blank lines that surrounded it, which
// would accumulate into gaps. Collapse any run of 2+ blanks to one, and drop a
// blank left immediately after a block opens — the case where the removed
// region was the first thing in a function body.
function collapseBlankRuns(lines) {
  const collapsed = lines.filter(
    (line, index) => line.trim() !== "" || lines[index - 1]?.trim() !== "",
  );

  return collapsed.filter(
    (line, index) => line.trim() !== "" || !collapsed[index - 1]?.trimEnd().endsWith("{"),
  );
}

// ===== Function-scope resolution =====

// Finds the line range of a top-level function declaration by brace depth.
// Deliberately not a full parser: this only has to distinguish sibling
// top-level functions in the app's own data-access modules, which are plain
// `function` / `export async function` declarations.
function findFunctionRange(lines, functionName, relativePath) {
  const declaration = new RegExp(`^\\s*(?:export\\s+)?(?:async\\s+)?function\\s+${functionName}\\b`);
  const start = lines.findIndex((line) => declaration.test(line));

  if (start === -1) {
    fail(
      `${relativePath} has no top-level function named "${functionName}". ` +
        "Update scripts/cache-swap/fetch-cache-manifest.json if it was renamed or removed.",
    );
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

  fail(`${relativePath}: could not find the end of "${functionName}".`);
}

// ===== Pass 2: fetch cache options (manifest-driven) =====

// Inserts `cache: { profile, tags }` as the first property of the single
// cacheable GET inside the named function. Requires exactly one — more than
// one is ambiguous and can't be resolved from the manifest, so it fails rather
// than guessing.
function addFetchCacheOptions(source, entry) {
  const lines = source.split("\n");
  const { start, end } = findFunctionRange(lines, entry.function, entry.file);

  const getCalls = [];

  for (let index = start; index <= end; index += 1) {
    if (/apiClient\.get</.test(lines[index])) {
      getCalls.push(index);
    }
  }

  if (getCalls.length === 0) {
    fail(`${entry.file}: "${entry.function}" contains no apiClient.get call to cache.`);
  }

  if (getCalls.length > 1) {
    fail(
      `${entry.file}: "${entry.function}" contains ${getCalls.length} apiClient.get calls. ` +
        "The manifest can only target a function with exactly one.",
    );
  }

  const callLine = getCalls[0];

  if (!lines[callLine].trimEnd().endsWith("{")) {
    fail(
      `${entry.file}: the apiClient.get call in "${entry.function}" has no options object. ` +
        "Give it a trailing `, {` / `});` so the swap has somewhere to add cache options.",
    );
  }

  if (lines[callLine + 1]?.includes("cache: {")) {
    return { source, alreadyApplied: true };
  }

  const indent = `${lines[callLine].match(/^\s*/)[0]}  `;
  const tags = entry.tags.join(", ");
  const option = `${indent}cache: { profile: ${entry.profile}, tags: [${tags}] },`;

  lines.splice(callLine + 1, 0, option);

  return { source: lines.join("\n"), alreadyApplied: false };
}

// Constants a fetch tag refers to that have no Cache Components counterpart
// (e.g. a list tag only the fetch implementation needs). Inserted above the
// function that uses them.
function declareConstants(source, entry) {
  let updated = source;

  for (const constant of entry.declareConstants ?? []) {
    if (new RegExp(`\\b(?:const|let)\\s+${constant.name}\\b`).test(updated)) {
      continue;
    }

    const lines = updated.split("\n");
    const { start } = findFunctionRange(lines, entry.function, entry.file);
    const block = [
      ...(constant.comment ?? []).map((line) => `// ${line}`),
      `const ${constant.name} = "${constant.value}";`,
      "",
    ];

    // Insert above the function's own leading comment block, not between the
    // comment and its function.
    let insertAt = start;

    while (insertAt > 0 && lines[insertAt - 1].trim().startsWith("//")) {
      insertAt -= 1;
    }

    lines.splice(insertAt, 0, ...block);
    updated = lines.join("\n");
  }

  return updated;
}

// ===== Import handling =====

// Adds a specifier to an existing import from the same module, or appends a
// whole import line if there isn't one. Import order is not significant here
// (the project has no import/order lint rule), so appending is the durable
// choice — it can't disturb an existing group.
function addImportSpecifier(source, moduleSpecifier, specifier) {
  if (new RegExp(`\\b${specifier}\\b`).test(source.split("\n").filter((l) => l.startsWith("import ")).join("\n"))) {
    return source;
  }

  const lines = source.split("\n");
  const existing = lines.findIndex(
    (line) => line.startsWith("import ") && line.includes(`"${moduleSpecifier}"`) && line.includes("{"),
  );

  if (existing !== -1) {
    lines[existing] = lines[existing].replace(/\{\s*/, `{ ${specifier}, `).replace(/\{\s+/, "{ ");

    return lines.join("\n");
  }

  const lastImport = lines.reduce((last, line, index) => (line.startsWith("import ") ? index : last), -1);
  const importLine = `import { ${specifier} } from "${moduleSpecifier}";`;

  lines.splice(lastImport + 1, 0, importLine);

  return lines.join("\n");
}

function ensureProfileImport(source, profile) {
  return addImportSpecifier(source, "@/lib/cache/cache-profiles", profile);
}

// ===== Pass 3: invalidations =====

// Rewrites the tag-invalidation call the two implementations don't share, and
// adds the list-tag companions that only fetch caching needs.
function applyInvalidations(source, entry) {
  let updated = source;
  const { from, to, extraArgs = [] } = entry.rewriteCalls;

  updated = updated.replace(new RegExp(`\\b${from}\\b`, "g"), to);

  const suffix = extraArgs.length > 0 ? `, ${extraArgs.join(", ")}` : "";
  const lines = updated.split("\n");
  const result = [];

  for (const [index, line] of lines.entries()) {
    const call = line.match(new RegExp(`^(\\s*)${to}\\((.+)\\);\\s*$`));

    if (!call) {
      result.push(line);
      continue;
    }

    const [, indent, argument] = call;

    // Skip a call that already carries the extra argument, when there is one
    // to carry (idempotence).
    if (extraArgs.length > 0 && extraArgs.some((extra) => argument.endsWith(extra))) {
      result.push(line);
      continue;
    }

    result.push(`${indent}${to}(${argument}${suffix});`);

    const tagFunction = argument.match(/^(\w+)\(/)?.[1];
    const companion = entry.companionTags?.[tagFunction];

    if (!companion) {
      continue;
    }

    // Only append the companion if the next line isn't already it. Without
    // this the rewrite is not idempotent when `to` matches `from` and there
    // are no extraArgs to detect an already-processed call by — a second run
    // would add a duplicate companion after every record-tag call.
    const companionCall = `${indent}${to}(${companion}${suffix});`;

    if (lines[index + 1]?.trimEnd() !== companionCall.trimEnd()) {
      result.push(companionCall);
    }
  }

  updated = result.join("\n");

  for (const { from: moduleSpecifier, specifier } of entry.addImportSpecifiers ?? []) {
    updated = addImportSpecifier(updated, moduleSpecifier, specifier);
  }

  return updated;
}

// ===== Pass 4: leftover check =====

// Nothing that only works under Cache Components may survive the swap. This
// catches the failure mode markers can't: a construct nobody wrapped, which
// would otherwise be left behind silently and only surface as a runtime error
// (or, worse, as caching that quietly does nothing).
// `updateTag` is deliberately absent: both implementations invalidate with it.
// It reaches fetch-cached entries through Next's incremental cache, not only
// through `use cache` boundaries, so it is valid on either side of the swap.
const CACHE_COMPONENTS_ONLY_API = ['"use cache', "cacheLife(", "cacheTag("];

function findLeftovers(files) {
  const leftovers = [];

  for (const relativePath of files) {
    const lines = readFileSync(path.join(repoRoot, relativePath), "utf8").split("\n");

    for (const [index, line] of lines.entries()) {
      for (const api of CACHE_COMPONENTS_ONLY_API) {
        if (line.includes(api)) {
          leftovers.push(`${relativePath}:${index + 1} ${line.trim()}`);
        }
      }
    }
  }

  return leftovers;
}

// ===== Entry point =====

export function swapToFetchCaching() {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const files = manifest.searchDirs.flatMap((dir) => collectSourceFiles(dir));

  // --- Pass 1: removals ---
  let filesChanged = 0;

  for (const relativePath of files) {
    const absolute = path.join(repoRoot, relativePath);
    const original = readFileSync(absolute, "utf8");

    if (!original.includes(MARKER_START) && !original.includes(MARKER_DROP_SPECIFIER)) {
      continue;
    }

    const updated = removeCacheComponentsCode(original, relativePath);

    if (updated !== original) {
      writeFileSync(absolute, updated);
      filesChanged += 1;
    }
  }

  log(
    filesChanged > 0
      ? `Removed Cache Components code from ${filesChanged} file(s).`
      : "No @cache-components-only markers found — already swapped.",
  );

  // --- Pass 2: fetch cache options ---
  let optionsAdded = 0;

  for (const entry of manifest.fetchCaching) {
    const absolute = path.join(repoRoot, entry.file);

    if (!existsSync(absolute)) {
      fail(`manifest references a missing file: ${entry.file}`);
    }

    let source = readFileSync(absolute, "utf8");
    const { source: withOptions, alreadyApplied } = addFetchCacheOptions(source, entry);

    if (alreadyApplied) {
      continue;
    }

    source = declareConstants(withOptions, entry);
    source = ensureProfileImport(source, entry.profile);

    for (const { from, specifier } of entry.addImportSpecifiers ?? []) {
      source = addImportSpecifier(source, from, specifier);
    }

    writeFileSync(absolute, source);
    optionsAdded += 1;
    log(`Cached ${entry.function} (${entry.profile}) in ${entry.file}.`);
  }

  if (optionsAdded === 0) {
    log("Fetch cache options already present.");
  }

  // --- Pass 3: invalidations ---
  for (const entry of manifest.invalidations) {
    const absolute = path.join(repoRoot, entry.file);

    if (!existsSync(absolute)) {
      fail(`manifest references a missing file: ${entry.file}`);
    }

    const original = readFileSync(absolute, "utf8");
    const updated = applyInvalidations(original, entry);

    if (updated !== original) {
      writeFileSync(absolute, updated);
      log(`Rewrote tag invalidation in ${entry.file}.`);
    }
  }

  // --- Pass 4: nothing Cache Components-only may survive ---
  const leftovers = findLeftovers(files);

  if (leftovers.length > 0) {
    fail(
      `Cache Components code survived the swap:\n  ${leftovers.join("\n  ")}\n` +
        "Wrap it in @cache-components-only markers so the swap removes it.",
    );
  }

  return { filesChanged, optionsAdded };
}
