// Scaffolds this app for deployment on Cloudflare Workers via
// @opennextjs/cloudflare, using the D1 credentials-store driver (see
// src/lib/credentials-store/d1-driver/). Run via `pnpm scaffold cloudflare`.
//
// Idempotent: safe to re-run (e.g. after pulling upstream changes) — it only
// adds what's missing, and never overwrites a script/file a dev may have
// already customized.
//
// Deliberately does not run `pnpm install`. Dependencies are written into
// package.json and the developer installs them, which keeps this script
// offline-safe, avoids a lockfile write mid-scaffold, and preserves the exact
// pinned versions below rather than whatever `pnpm add` would resolve.
//
// Deliberately does not create wrangler.jsonc either. That file carries
// account-specific resource ids, so the developer copies the generated
// wrangler.jsonc.example and fills them in — see docs/CLOUDFLARE-DEPLOYMENT.md.
import { readFileSync, writeFileSync, existsSync, copyFileSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { swapToFetchCaching } from "../cache-swap/swap-to-fetch-caching.mjs";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));
const templatesDir = path.join(repoRoot, "scripts/cloudflare/templates");

const LOG_PREFIX = "[scaffold:cloudflare]";

function log(message) {
  console.log(`${LOG_PREFIX} ${message}`);
}

const DEPENDENCIES_TO_ADD = {
  "@opennextjs/cloudflare": "1.20.5",
};

const DEV_DEPENDENCIES_TO_ADD = {
  wrangler: "^4.128.0",
};

// The migrate scripts name the credentials database, which the developer
// creates and names themselves — so they carry the same
// {{CREDENTIALS_DB_NAME}} placeholder as wrangler.jsonc.example and have to be
// edited to match it. Left unreplaced, the migrate step fails rather than
// migrating the wrong database, though wrangler's message ("No migrations
// present at ./migrations") doesn't point at the placeholder, so the
// next-steps output below calls this out explicitly.
const CREDENTIALS_DB_PLACEHOLDER = "{{CREDENTIALS_DB_NAME}}";

function scriptsToAdd() {
  return {
    preview: "pnpm run d1:migrate && opennextjs-cloudflare build && opennextjs-cloudflare preview",
    deploy:
      "pnpm run d1:migrate:remote && wrangler secret bulk .secrets.production && " +
      "opennextjs-cloudflare build && opennextjs-cloudflare deploy",
    upload: "opennextjs-cloudflare build && opennextjs-cloudflare upload",
    "cf-typegen": "wrangler types --env-interface CloudflareEnv cloudflare-env.d.ts",
    "d1:migrate": `wrangler d1 migrations apply ${CREDENTIALS_DB_PLACEHOLDER} --local`,
    "d1:migrate:remote": `wrangler d1 migrations apply ${CREDENTIALS_DB_PLACEHOLDER} --remote`,
  };
}

// Files copied verbatim from templates/. Each is an *example*: the developer
// copies it to the real filename and fills in their own values, so the scaffold
// never writes a file containing credentials or account ids.
const EXAMPLE_FILES = [
  { template: "dev.vars.example", destination: ".dev.vars.example" },
  { template: "env.production.local.example", destination: ".env.production.local.example" },
  { template: "secrets.production.example", destination: ".secrets.production.example" },
];

function readPackageJson() {
  return JSON.parse(readFileSync(path.join(repoRoot, "package.json"), "utf8"));
}

// Preserves the file's existing 2-space/trailing-newline formatting rather than
// reformatting the whole file.
function writePackageJson(packageJson) {
  writeFileSync(path.join(repoRoot, "package.json"), `${JSON.stringify(packageJson, null, 2)}\n`);
}

function addDependencies() {
  const packageJson = readPackageJson();
  let added = false;

  for (const [group, additions] of [
    ["dependencies", DEPENDENCIES_TO_ADD],
    ["devDependencies", DEV_DEPENDENCIES_TO_ADD],
  ]) {
    for (const [name, version] of Object.entries(additions)) {
      if (packageJson[group][name]) {
        log(`package.json already depends on ${name} — leaving it as-is.`);
        continue;
      }

      packageJson[group][name] = version;
      packageJson[group] = Object.fromEntries(Object.entries(packageJson[group]).sort());
      added = true;
      log(`Added ${name}@${version} to ${group}.`);
    }
  }

  if (added) {
    writePackageJson(packageJson);
  }

  return added;
}

function addScripts() {
  const packageJson = readPackageJson();
  let added = false;

  for (const [name, command] of Object.entries(scriptsToAdd())) {
    if (packageJson.scripts[name]) {
      log(`package.json already has a "${name}" script — leaving it as-is.`);
      continue;
    }

    packageJson.scripts[name] = command;
    added = true;
    log(`Added "${name}" script to package.json.`);
  }

  if (added) {
    writePackageJson(packageJson);
  }
}

function writeExampleFiles() {
  for (const { template, destination } of EXAMPLE_FILES) {
    const destinationPath = path.join(repoRoot, destination);

    if (existsSync(destinationPath)) {
      log(`${destination} already exists — leaving it as-is.`);
      continue;
    }

    copyFileSync(path.join(templatesDir, template), destinationPath);
    log(`Wrote ${destination}.`);
  }
}

// Copied verbatim, {{PLACEHOLDERS}} intact: every value in it names a
// Cloudflare resource the developer creates and names themselves, so the
// scaffold shouldn't presume any of them.
function writeWranglerExample() {
  const destinationPath = path.join(repoRoot, "wrangler.jsonc.example");

  if (existsSync(destinationPath)) {
    log("wrangler.jsonc.example already exists — leaving it as-is.");
    return;
  }

  copyFileSync(path.join(templatesDir, "wrangler.jsonc.example"), destinationPath);
  log("Wrote wrangler.jsonc.example.");
}

function writeOpenNextConfig() {
  const destinationPath = path.join(repoRoot, "open-next.config.ts");

  if (existsSync(destinationPath)) {
    log("open-next.config.ts already exists — leaving it as-is.");
    return;
  }

  copyFileSync(path.join(templatesDir, "open-next.config.ts.template"), destinationPath);
  log("Wrote open-next.config.ts.");
}

// Swaps the core D1 loader — which throws, because obtaining a D1 binding is
// platform-specific — for the version that reads the binding off the Worker
// env. See the comments in both files.
function installD1DriverLoader() {
  const destination = "src/lib/credentials-store/d1-driver-loader.ts";
  const destinationPath = path.join(repoRoot, destination);
  const installed = readFileSync(path.join(templatesDir, "d1-driver-loader.ts.template"), "utf8");

  if (readFileSync(destinationPath, "utf8") === installed) {
    log(`${destination} is already the Cloudflare version — leaving it as-is.`);
    return;
  }

  writeFileSync(destinationPath, installed);
  log(`Installed the Cloudflare D1 loader over ${destination}.`);
}

// Renames src/proxy.ts to src/middleware.ts, and its exported function to
// match.
//
// `proxy` is Next 16's current convention and `middleware` is deprecated, so
// the core app uses the former. But Next only records a middleware entry in
// .next/server/middleware-manifest.json for the `middleware` filename — with
// proxy.ts the manifest's `middleware` array is empty, even though the code is
// compiled to .next/server/middleware.js. OpenNext reads that manifest to
// decide whether there is middleware to bundle, so on the Workers target
// proxy.ts means the authorization gate is silently dropped from the deployed
// Worker. Renaming is what keeps it.
function renameProxyToMiddleware() {
  const proxyPath = path.join(repoRoot, "src/proxy.ts");
  const middlewarePath = path.join(repoRoot, "src/middleware.ts");

  if (existsSync(middlewarePath)) {
    log("src/middleware.ts already exists — leaving it as-is.");
    return;
  }

  if (!existsSync(proxyPath)) {
    log("WARNING: neither src/proxy.ts nor src/middleware.ts found. Skipping the middleware rename.");
    return;
  }

  const source = readFileSync(proxyPath, "utf8");
  const renamed = source.replace(/\bexport async function proxy\b/, "export async function middleware");

  if (renamed === source) {
    log("WARNING: src/proxy.ts has no `export async function proxy` to rename. Renaming the file only.");
  }

  writeFileSync(middlewarePath, renamed);
  rmSync(proxyPath);
  log("Renamed src/proxy.ts to src/middleware.ts (Next records middleware only under that name).");
}

// Cache Components (PPR) corrupts streamed HTML on Workers via
// @opennextjs/cloudflare, so the Cloudflare target runs with it off and caches
// at the fetch level instead (see the cache swap).
function disableCacheComponents() {
  const configPath = path.join(repoRoot, "next.config.ts");
  const original = readFileSync(configPath, "utf8");

  if (/cacheComponents:\s*false/.test(original)) {
    log("next.config.ts already has cacheComponents: false — leaving it as-is.");
    return;
  }

  const updated = original.replace(/cacheComponents:\s*true/, "cacheComponents: false");

  if (updated === original) {
    log("WARNING: could not find a `cacheComponents` setting in next.config.ts. Set it to false by hand.");
    return;
  }

  writeFileSync(configPath, updated);
  log("Set cacheComponents to false in next.config.ts.");
}

export async function scaffold() {
  swapToFetchCaching();
  disableCacheComponents();
  renameProxyToMiddleware();
  installD1DriverLoader();
  writeOpenNextConfig();
  writeExampleFiles();
  writeWranglerExample();
  addDependencies();
  addScripts();

  console.log(
    `\n${LOG_PREFIX} Done. Next steps:\n` +
      "  1. Install the new dependencies:\n" +
      "       pnpm install\n" +
      "  2. Create your Cloudflare resources, and record the names you give them\n" +
      "     plus the ids Cloudflare prints: an R2 bucket for the incremental cache,\n" +
      "     a D1 database for the cache tags, and a separate D1 database for the\n" +
      "     credentials store. See docs/CLOUDFLARE-DEPLOYMENT.md for the commands.\n" +
      "  3. Copy wrangler.jsonc.example to wrangler.jsonc and replace every\n" +
      "     {{PLACEHOLDER}} with those names and ids.\n" +
      "\n" +
      "     Then replace {{CREDENTIALS_DB_NAME}} in the d1:migrate and\n" +
      "     d1:migrate:remote scripts in package.json with the same credentials\n" +
      "     database name you used in wrangler.jsonc.\n" +
      "  4. Copy the var templates and fill in your values:\n" +
      "       cp .secrets.production.example .secrets.production\n" +
      "       cp .env.production.local.example .env.production.local\n" +
      "       cp .dev.vars.example .dev.vars\n" +
      "  5. Generate the Cloudflare binding types (needs wrangler.jsonc to exist):\n" +
      "       pnpm cf-typegen\n" +
      "  6. Apply the credentials-store migrations, then preview or deploy:\n" +
      "       pnpm preview\n" +
      "       pnpm deploy\n",
  );
}
