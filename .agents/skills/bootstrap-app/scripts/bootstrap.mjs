#!/usr/bin/env node
// Bootstraps a single starter page for the developer's own feature, after
// remove.mjs (and any manual cleanup) has removed the example:
//
//   * src/components/<feature>/<feature>-page.tsx — the starter component
//   * src/app/store/[storeHash]/<feature>/page.tsx — its AuthorizedPage route
//   * src/app/(root)/<feature>/page.tsx — the MOCK/STATIC dev alias
//   * src/app/store/[storeHash]/page.tsx — a pass-through to that route
//   * NAV_ITEMS in src/components/<feature>/main-nav.tsx — one index item
//   * with --app-name: package.json name and root layout metadata
//
// Usage (from the repo root):
//   node .agents/skills/bootstrap-app/scripts/bootstrap.mjs \
//     --feature <kebab-name> [--title "<Title>"] [--app-name "<App Name>"]

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  EXAMPLE_MODULE_DIRS,
  exists,
  fail,
  log,
  parseArgs,
  printManualFollowUps,
  tryEdit,
  validateFeatureName,
  write,
} from "./shared.mjs";

const templatesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "../templates");

const args = parseArgs(process.argv.slice(2), ["feature", "title", "app-name"]);
const feature = args.feature;

validateFeatureName(feature);

const toWords = (kebab) => kebab.split("-").map((part) => part[0].toUpperCase() + part.slice(1));
const title = args.title ?? toWords(feature).join(" ");

if (!/^[\w .,&'()-]+$/.test(title)) {
  fail("--title may only contain letters, numbers, spaces, and . , & ' ( ) -");
}

const remainingExampleDirs = EXAMPLE_MODULE_DIRS.filter(exists);

if (remainingExampleDirs.length) {
  fail(`example code is still present (${remainingExampleDirs.join(", ")}) — run remove.mjs first.`);
}

const values = {
  __FEATURE__: feature,
  __TITLE__: title,
  __COMPONENT__: `${toWords(feature).join("")}Page`,
  __ROUTE_COMPONENT__: `${toWords(feature).join("")}RoutePage`,
};

const render = (name) =>
  Object.entries(values).reduce(
    (content, [token, value]) => content.replaceAll(token, value),
    readFileSync(path.join(templatesDir, name), "utf8"),
  );

const newFiles = [
  [`src/components/${feature}/${feature}-page.tsx`, "feature-page.tsx.template"],
  [`src/app/store/[storeHash]/${feature}/page.tsx`, "store-route-page.tsx.template"],
  [`src/app/(root)/${feature}/page.tsx`, "root-route-page.tsx.template"],
];

for (const [file] of newFiles) {
  if (exists(file)) {
    fail(`${file} already exists — refusing to overwrite it.`);
  }
}

for (const [file, template] of newFiles) {
  write(file, render(template));
  log(`created  ${file}`);
}

write("src/app/store/[storeHash]/page.tsx", render("store-index-page.tsx.template"));
log("replaced src/app/store/[storeHash]/page.tsx with a pass-through to the feature route");

tryEdit(
  `src/components/${feature}/main-nav.tsx`,
  /const NAV_ITEMS = \[[\s\S]*?\];/,
  `const NAV_ITEMS = [\n  { id: "${feature}", title: "${title}", isIndex: true },\n];`,
  "reset NAV_ITEMS to the feature's index item",
);

if (args["app-name"]) {
  const appName = args["app-name"];
  const packageName = appName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  tryEdit("package.json", /"name": "[^"]*"/, `"name": "${packageName}"`, "set the package name");
  tryEdit("src/app/layout.tsx", /title: "[^"]*"/, `title: ${JSON.stringify(appName)}`, "set the metadata title");
  tryEdit(
    "src/app/layout.tsx",
    /description: "[^"]*"/,
    `description: ${JSON.stringify(`A BigCommerce single-click app: ${appName}.`)}`,
    "set the metadata description",
  );
}

printManualFollowUps();
console.log("\n[bootstrap-app] Next: run scan.mjs, then type-check and lint.");
