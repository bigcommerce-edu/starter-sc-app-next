// Shared helpers and configuration for remove.mjs, scan.mjs, and bootstrap.mjs.
// Every script runs from the repo root.

import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

export const repoRoot = process.cwd();

// ===== Example-feature configuration =====
// Extend these when the example grows. Anything they miss should still
// surface in scan.mjs's report, for the agent to handle by hand.

// Directories holding nothing but example code. Deleted wholesale (after
// PRESERVE copies what's worth keeping), and any import of a module inside
// them marks the importer as example code too.
export const EXAMPLE_MODULE_DIRS = ["src/lib/gift-certs-manager", "src/components/gift-certs-manager"];

// Route roots whose direct child directories are feature sections. A child
// is removed when anything inside it imports an example module or another
// removed section (e.g. a (root) alias re-exporting a store-scoped page).
// Route files outside these roots (e.g. app/api/app/auth) are never deleted
// — a reference there is reported as a manual edit.
export const FEATURE_ROUTE_ROOTS = ["src/app/(root)", "src/app/store/[storeHash]", "src/app/api/internal"];

// Files copied out of the example before it's deleted. `{feature}` is the
// developer's feature directory name. appExtension entries apply only with
// --app-extension keep.
export const PRESERVE = [
  { from: "src/components/gift-certs-manager/app-shell.tsx", to: "src/components/{feature}/app-shell.tsx" },
  { from: "src/components/gift-certs-manager/main-nav.tsx", to: "src/components/{feature}/main-nav.tsx" },
  { from: "src/lib/gift-certs-manager/register-app-extension.ts", to: "src/lib/{feature}/register-app-extension.ts", appExtension: true },
  { from: "src/lib/gift-certs-manager/app-extension-gql.ts", to: "src/lib/{feature}/app-extension-gql.ts", appExtension: true },
  { from: "src/lib/gift-certs-manager/app-extension-status.ts", to: "src/lib/{feature}/app-extension-status.ts", appExtension: true },
  {
    from: "src/components/gift-certs-manager/app-extension-status-banner",
    to: "src/components/{feature}/app-extension-status-banner",
    appExtension: true,
  },
];

export const MOCK_HANDLER_REGISTRY = "src/lib/bc-api-client/rest-client/mock-rest-client/handler-registry.ts";
export const CACHE_SWAP_MANIFEST = "scripts/cache-swap/fetch-cache-manifest.json";

// Where scan.mjs looks. Docs (README, docs/, CHANGELOG, AGENTS) are
// deliberately excluded — SKILL.md's docs phase covers them in plain language.
export const SCAN_DIRS = ["src", "scripts"];
export const SCAN_ROOT_FILES = ["next.config.ts", "package.json", ".env.example", "eslint.config.mjs", "tsconfig.json"];

// "strong" hits are almost certainly example leftovers; "weak" hits are
// often generic BigCommerce wording and need judgment.
export const STRONG_KEYWORDS = /gift[- _]?cert|giftcert|gift-certs-manager/i;
export const WEAK_KEYWORDS = /\bcustomers?\b|\bchannels?\b/i;

// ===== Filesystem helpers =====

export const abs = (relativePath) => path.join(repoRoot, relativePath);
export const exists = (relativePath) => existsSync(abs(relativePath));
export const read = (relativePath) => readFileSync(abs(relativePath), "utf8");

export function write(relativePath, content) {
  mkdirSync(path.dirname(abs(relativePath)), { recursive: true });
  writeFileSync(abs(relativePath), content);
}

export function remove(relativePath) {
  if (exists(relativePath)) {
    rmSync(abs(relativePath), { recursive: true, force: true });
    log(`removed  ${relativePath}`);
  }
}

// Removes now-empty parent directories, stopping at (and never removing) stopAt.
export function pruneEmptyParents(relativePath, stopAt = "src/app") {
  let dir = path.dirname(relativePath);

  while (dir.startsWith(stopAt) && dir !== stopAt && exists(dir) && readdirSync(abs(dir)).length === 0) {
    remove(dir);
    dir = path.dirname(dir);
  }
}

export function sourceFiles(dir, pattern = /\.(ts|tsx|mts|mjs|cjs|js|json|sql)$/) {
  if (!exists(dir)) {
    return [];
  }

  if (statSync(abs(dir)).isFile()) {
    return [dir];
  }

  return readdirSync(abs(dir)).flatMap((entry) => {
    const relativePath = path.join(dir, entry);

    if (statSync(abs(relativePath)).isDirectory()) {
      return entry === "node_modules" ? [] : sourceFiles(relativePath, pattern);
    }

    return pattern.test(entry) ? [relativePath] : [];
  });
}

export const childDirs = (dir) =>
  exists(dir) ? readdirSync(abs(dir)).map((entry) => path.join(dir, entry)).filter((p) => statSync(abs(p)).isDirectory()) : [];

// ===== Module specifiers =====

// "src/lib/foo/bar.ts" -> "@/lib/foo/bar"
export const toSpecifier = (relativePath) => `@/${relativePath.replace(/^src\//, "").replace(/\.(tsx?|mts)$/, "")}`;

export const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const IMPORT_PATTERN = /(?:from\s+|import\s*\(\s*|import\s+)["']([^"']+)["']/g;

export function importSpecifiers(content) {
  return [...content.matchAll(IMPORT_PATTERN)].map((match) => match[1]);
}

const RESOLVE_SUFFIXES = ["", ".ts", ".tsx", ".mts", ".js", ".mjs", "/index.ts", "/index.tsx"];

// Resolves an "@/" or relative specifier to a repo-relative path; returns
// null when it doesn't exist, undefined for bare package specifiers.
export function resolveSpecifier(fromFile, specifier) {
  let base;

  if (specifier.startsWith("@/")) {
    base = path.join("src", specifier.slice(2));
  } else if (specifier.startsWith(".")) {
    base = path.join(path.dirname(fromFile), specifier);
  } else {
    return undefined;
  }

  const match = RESOLVE_SUFFIXES.map((suffix) => base + suffix).find(
    (candidate) => exists(candidate) && statSync(abs(candidate)).isFile(),
  );

  return match ?? null;
}

// ===== Editing =====

export const manualFollowUps = [];

// Applies an edit if its expected text is present; otherwise records a manual
// follow-up instead of failing, since the starter may have drifted.
export function tryEdit(relativePath, search, replacement, description) {
  if (!exists(relativePath)) {
    manualFollowUps.push(`${relativePath}: missing — ${description}`);
    return false;
  }

  const before = read(relativePath);
  const after = before.replace(search, replacement);

  if (after === before) {
    manualFollowUps.push(`${relativePath}: ${description} (expected text not found — do this by hand)`);
    return false;
  }

  write(relativePath, after);
  log(`edited   ${relativePath}: ${description}`);
  return true;
}

// ===== CLI =====

export function log(message) {
  console.log(`[bootstrap-app] ${message}`);
}

export function fail(message) {
  console.error(`[bootstrap-app] ERROR: ${message}`);
  process.exit(1);
}

export function parseArgs(argv, valueFlags, booleanFlags = []) {
  const args = {};

  for (let i = 0; i < argv.length; i++) {
    const name = argv[i].replace(/^--/, "");

    if (booleanFlags.includes(name)) {
      args[name] = true;
    } else if (valueFlags.includes(name)) {
      const value = argv[++i];

      if (value === undefined) {
        fail(`--${name} needs a value`);
      }

      // Repeatable flags collect into an array.
      args[name] = name in args ? [].concat(args[name], value) : value;
    } else {
      fail(`unknown argument: ${argv[i]}`);
    }
  }

  return args;
}

export function validateFeatureName(feature) {
  if (!feature || !/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(feature)) {
    fail("--feature is required and must be kebab-case (e.g. order-notes).");
  }

  const collisions = [
    ...EXAMPLE_MODULE_DIRS.map((dir) => path.basename(dir)),
    "layout",
    "ui",
    "api",
    "app-error",
    "unauthorized",
    "store",
  ];

  if (collisions.includes(feature)) {
    fail(`--feature "${feature}" collides with an existing starter directory.`);
  }
}

export function printManualFollowUps() {
  if (manualFollowUps.length) {
    console.log("\n[bootstrap-app] MANUAL FOLLOW-UPS (the script couldn't do these):");
    console.log(manualFollowUps.map((item) => `  - ${item}`).join("\n"));
  }
}
