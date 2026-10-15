#!/usr/bin/env node
// Removes the Gift Certificates Manager example, following the "What to
// Remove" and "What to Update" sections of docs/USING-AS-A-STARTER.md:
//
//   1. Preserve — copy the example files worth keeping (app shell, main nav,
//      and optionally the app extension) into the developer's feature dirs.
//   2. Rewire — point every import of a preserved file at its new copy.
//   3. Discover + delete — remove the example module dirs, plus every feature
//      route section that still imports them (found by import, not by name).
//   4. Unwire — mock handler registry, cache-swap manifest, and (with
//      --app-extension remove) the extension's install-time registration.
//
// Edits that no longer match the starter are reported as manual follow-ups
// rather than failing. Run scan.mjs afterward to find anything this missed.
//
// Usage (from the repo root):
//   node .agents/skills/bootstrap-app/scripts/remove.mjs \
//     --feature <kebab-name> --app-extension keep|remove \
//     [--extra-dir <path>]... [--force]
//
// --extra-dir adds another example-only directory (repeatable), for example
// code that's been added to the starter since this script was written.

import { cpSync, mkdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import path from "node:path";
import {
  CACHE_SWAP_MANIFEST,
  EXAMPLE_MODULE_DIRS,
  FEATURE_ROUTE_ROOTS,
  MOCK_HANDLER_REGISTRY,
  PRESERVE,
  abs,
  childDirs,
  escapeRegExp,
  exists,
  fail,
  importSpecifiers,
  log,
  parseArgs,
  printManualFollowUps,
  pruneEmptyParents,
  read,
  remove,
  resolveSpecifier,
  sourceFiles,
  toSpecifier,
  tryEdit,
  validateFeatureName,
  write,
  manualFollowUps,
} from "./shared.mjs";

const args = parseArgs(process.argv.slice(2), ["feature", "app-extension", "extra-dir"], ["force"]);
const feature = args.feature;

validateFeatureName(feature);

if (!["keep", "remove"].includes(args["app-extension"])) {
  fail("--app-extension must be \"keep\" or \"remove\".");
}

const keepExtension = args["app-extension"] === "keep";
const exampleDirs = [...EXAMPLE_MODULE_DIRS, ...[].concat(args["extra-dir"] ?? [])].map((dir) => dir.replace(/\/$/, ""));

if (!exampleDirs.some(exists)) {
  fail("no example directories found — already removed, or not run from the repo root.");
}

const dirty = execSync("git status --porcelain -- src scripts package.json", { cwd: abs("."), encoding: "utf8" }).trim();

if (dirty && !args.force) {
  fail(`uncommitted changes under src/, scripts/, or package.json — commit or stash first (or pass --force):\n${dirty}`);
}

const isInExampleDir = (file) => exampleDirs.some((dir) => file === dir || file.startsWith(`${dir}/`));

// ===== 1. Preserve =====

const preserved = PRESERVE.filter((entry) => keepExtension || !entry.appExtension).map((entry) => ({
  from: entry.from,
  to: entry.to.replaceAll("{feature}", feature),
}));

for (const { from, to } of preserved) {
  if (!exists(from)) {
    manualFollowUps.push(`${from}: expected to preserve it to ${to}, but it doesn't exist — find its replacement, if any`);
    continue;
  }

  if (exists(to)) {
    fail(`${to} already exists — refusing to overwrite it.`);
  }

  mkdirSync(path.dirname(abs(to)), { recursive: true });
  cpSync(abs(from), abs(to), { recursive: true });
  log(`copied   ${from} -> ${to}`);
}

// ===== 2. Rewire imports of preserved files =====

const specifierRewrites = preserved
  .filter(({ from }) => exists(from))
  .map(({ from, to }) => [new RegExp(`${escapeRegExp(toSpecifier(from))}(?=["'/])`, "g"), toSpecifier(to)]);

for (const file of sourceFiles("src", /\.(tsx?|mts)$/)) {
  if (isInExampleDir(file)) {
    continue;
  }

  const before = read(file);
  const after = specifierRewrites.reduce((content, [search, replacement]) => content.replace(search, replacement), before);

  if (after !== before) {
    write(file, after);
    log(`rewired  ${file}`);
  }
}

// ===== 3. Discover example route sections, then delete =====

const exampleSpecifierPrefixes = exampleDirs.map(toSpecifier);
const candidates = FEATURE_ROUTE_ROOTS.flatMap(childDirs).filter((dir) => !isInExampleDir(dir));
const exampleRoutes = new Set();

// Iterates to a fixpoint so a section that only re-exports another removed
// section (the (root) aliases) is caught too.
let changed = true;

while (changed) {
  changed = false;

  for (const dir of candidates) {
    if (exampleRoutes.has(dir)) {
      continue;
    }

    const prefixes = [...exampleSpecifierPrefixes, ...[...exampleRoutes].map(toSpecifier)];
    const importsExample = sourceFiles(dir, /\.(tsx?|mts)$/).some((file) =>
      importSpecifiers(read(file)).some((specifier) =>
        prefixes.some((prefix) => specifier === prefix || specifier.startsWith(`${prefix}/`)),
      ),
    );

    if (importsExample) {
      exampleRoutes.add(dir);
      changed = true;
    }
  }
}

for (const dir of [...exampleRoutes, ...exampleDirs]) {
  remove(dir);
  pruneEmptyParents(dir, dir.startsWith("src/app") ? "src/app" : "src");
}

// ===== 4. Unwire keepers =====

// Mock handler registry: drop imports from removed modules and their spread
// entries, leaving any other feature's handlers in place.
if (exists(MOCK_HANDLER_REGISTRY)) {
  let content = read(MOCK_HANDLER_REGISTRY);
  const removedBindings = [];

  content = content.replace(/^import \{([^}]+)\} from "([^"]+)";\n/gm, (line, bindings, specifier) => {
    if (!exampleSpecifierPrefixes.some((prefix) => specifier.startsWith(`${prefix}/`))) {
      return line;
    }

    removedBindings.push(...bindings.split(",").map((binding) => binding.trim()).filter(Boolean));
    return "";
  });

  for (const binding of removedBindings) {
    content = content.replace(new RegExp(`^\\s*\\.\\.\\.${escapeRegExp(binding)},?\\s*\\n`, "m"), "");
  }

  if (removedBindings.length) {
    write(MOCK_HANDLER_REGISTRY, content);
    log(`edited   ${MOCK_HANDLER_REGISTRY}: removed ${removedBindings.join(", ")}`);
  }
}

// App extension: without it, /auth no longer registers one and the shell no
// longer shows its status banner. With it, the preserved copies just need
// re-pointing at the developer's feature.
const authRoute = "src/app/api/app/auth/route.ts";
const appShell = `src/components/${feature}/app-shell.tsx`;

if (keepExtension) {
  tryEdit(
    `src/lib/${feature}/app-extension-gql.ts`,
    /^export const APP_EXTENSION_INPUT/m,
    "// TODO: Point context/model/url/label at your own feature — the example's\n// target route has been removed.\nexport const APP_EXTENSION_INPUT",
    "flag APP_EXTENSION_INPUT for re-pointing",
  );
} else {
  tryEdit(authRoute, /^import \{ registerAppExtension \} from "[^"]+";\n/m, "", "remove the registerAppExtension import");
  tryEdit(
    authRoute,
    /\n(?:[ \t]*\/\/.*\n)*[ \t]*await registerAppExtension\([^)]*\);\n/,
    "",
    "remove the registerAppExtension call (and its comment)",
  );

  // accessToken was only read for the extension registration.
  if (exists(authRoute) && !/registerAppExtension/.test(read(authRoute)) && read(authRoute).match(/\baccessToken\b/g)?.length === 2) {
    tryEdit(authRoute, /^[ \t]*let accessToken: string;\n/m, "", "remove the now-unused accessToken variable");
    tryEdit(authRoute, "{ storeHash, accessToken }", "{ storeHash }", "stop destructuring accessToken");
  }

  tryEdit(appShell, /^import \{ AppExtensionStatusBanner \} from "[^"]+";\n/m, "", "remove the AppExtensionStatusBanner import");
  tryEdit(
    appShell,
    /\n[ \t]*<Suspense>\s*<AppExtensionStatusBanner \/>\s*<\/Suspense>/,
    "",
    "remove the AppExtensionStatusBanner element",
  );
}

// Store index page: once its pass-through target is gone, swap in a
// placeholder so the removal commit still builds. bootstrap.mjs replaces it.
const storeIndexPage = "src/app/store/[storeHash]/page.tsx";

if (exists(storeIndexPage) && importSpecifiers(read(storeIndexPage)).some((s) => resolveSpecifier(storeIndexPage, s) === null)) {
  const templatesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "../templates");

  write(storeIndexPage, readFileSync(path.join(templatesDir, "store-index-placeholder-page.tsx.template"), "utf8"));
  log(`replaced ${storeIndexPage} with a placeholder`);
}

// Cache-swap manifest: the swap script hard-fails on a missing file or
// searchDirs entry, so drop entries for removed files and re-point preserved
// ones. The feature dirs are added so their @cache-components-only markers
// are swapped too.
if (exists(CACHE_SWAP_MANIFEST)) {
  const manifest = JSON.parse(read(CACHE_SWAP_MANIFEST));
  const remapPath = (file) => preserved.find(({ from }) => file === from || file.startsWith(`${from}/`))
    ? preserved.reduce((current, { from, to }) => current.replace(from, to), file)
    : file;
  const keepEntry = (entry) => {
    entry.file = remapPath(entry.file);

    if (!exists(entry.file)) {
      log(`manifest dropped entry for ${entry.file}${entry.function ? ` (${entry.function})` : ""}`);
      return false;
    }

    for (const specifierEntry of entry.addImportSpecifiers ?? []) {
      if (exampleSpecifierPrefixes.some((prefix) => specifierEntry.from.startsWith(prefix))) {
        manualFollowUps.push(`${CACHE_SWAP_MANIFEST}: entry for ${entry.file} imports from removed ${specifierEntry.from}`);
      }
    }

    return true;
  };

  manifest.searchDirs = [
    ...new Set([...manifest.searchDirs.map(remapPath), `src/components/${feature}`, `src/lib/${feature}`]),
  ].filter(exists);
  manifest.fetchCaching = (manifest.fetchCaching ?? []).filter(keepEntry);
  manifest.invalidations = (manifest.invalidations ?? []).filter(keepEntry);
  write(CACHE_SWAP_MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
  log(`edited   ${CACHE_SWAP_MANIFEST}`);
}

console.log(`\n[bootstrap-app] Removed ${exampleRoutes.size} route section(s): ${[...exampleRoutes].join(", ") || "(none)"}`);
printManualFollowUps();
console.log("\n[bootstrap-app] Next: run scan.mjs and resolve what it reports before running bootstrap.mjs.");
