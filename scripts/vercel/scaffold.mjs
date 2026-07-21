// Scaffolds this app for deployment on Vercel, using the existing Postgres
// credentials-store driver (see src/lib/credentials-store/postgres-driver/)
// against Neon or any standard Postgres server. Run via `pnpm scaffold vercel`.
//
// Idempotent: safe to re-run (e.g. after pulling upstream changes) — it only
// adds what's missing, and never overwrites a script/file a dev may have
// already customized.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));
const packageJsonPath = `${repoRoot}/package.json`;
const envExamplePath = `${repoRoot}/.env.example`;
const envVercelExamplePath = `${repoRoot}/.env.vercel.example`;

const SCRIPTS_TO_ADD = {
  "db:postgres:migrate": "node scripts/postgres/migrate.mjs",
  "vercel-build": "pnpm db:postgres:migrate && next build",
};

const DEV_ONLY_START = "# DEV ONLY START";
const DEV_ONLY_END = "# DEV ONLY END";

// Strips every "# DEV ONLY START" / "# DEV ONLY END" block (inclusive) from
// a copy of .env.example — the convention for marking vars that only matter
// for local dev (MOCK/STATIC modes, the SQLite driver) and have no meaning
// in a real deployed profile like this one. Matched by these literal marker
// lines, not by inferring "belongs to the same var" from comment adjacency
// or blank lines, so it stays correct regardless of how the wrapped
// block's own prose comments are written, how many vars it contains, or
// where else in the file it's moved to.
function stripDevOnlyBlocks(lines) {
  const result = [];
  let inDevOnlyBlock = false;

  for (const line of lines) {
    if (line.trim() === DEV_ONLY_START) {
      inDevOnlyBlock = true;
      continue;
    }

    if (line.trim() === DEV_ONLY_END) {
      inDevOnlyBlock = false;
      continue;
    }

    if (!inDevOnlyBlock) {
      result.push(line);
    }
  }

  // A removed block leaves its surrounding blank lines behind (one before,
  // one after) — collapse any run of 2+ blank lines this creates down to 1,
  // rather than accumulating gaps across however many blocks were removed.
  return result.filter((line, index) => line.trim() !== "" || result[index - 1]?.trim() !== "");
}

// Each override replaces the block (comment lines + the KEY=value line
// itself) for KEY in a copy of .env.example — or appends a new block at the
// end if .env.example has no line for that key at all. Written against
// .env.example's *content*, not a fixed line number/snapshot of it, so this
// keeps working as-is if .env.example gains/reorders vars later — the only
// thing this script assumes is that KEY appears at the start of a line,
// optionally commented out with "# " (exactly how DATABASE_URL/
// DATABASE_URL_UNPOOLED are represented today, since Postgres is opt-in).
const ENV_OVERRIDES = {
  DATA_MODE: {
    comment: [
      "# Production mode: looks up each store's API token from durable storage",
      "# based on the authenticated session, rather than MOCK's in-memory data or",
      "# STATIC's single hardcoded token. See the comment above this var for the",
      "# full list of DATA_MODE values.",
    ],
    value: "MULTITENANT",
  },
  CREDENTIALS_STORE_DRIVER: {
    comment: [
      "# Selects the Postgres credentials-store driver (see",
      "# src/lib/credentials-store/postgres-driver/) over the SQLITE default —",
      "# required for MULTITENANT on Vercel, since SQLite's local-file model",
      "# doesn't survive Vercel's ephemeral, multi-instance filesystem.",
    ],
    value: "POSTGRES",
  },
  DATABASE_URL: {
    comment: [
      "# Required when CREDENTIALS_STORE_DRIVER=POSTGRES. A plain libpq connection",
      "# string — works with Neon or any standard Postgres server, not just Neon.",
      "# Provisioned automatically if you add the Vercel Postgres (Neon)",
      "# integration from your project's Storage tab; otherwise set it to your",
      "# own Postgres server's connection string.",
      "# Example: postgres://user:password@host/dbname?sslmode=require",
    ],
    value: "",
  },
  DATABASE_URL_UNPOOLED: {
    comment: [
      "# Used only by `pnpm db:postgres:migrate` (see scripts/postgres/migrate.mjs)",
      "# to run schema migrations against the *unpooled* (non-PgBouncer)",
      "# connection — not read by the app itself at request time. Provisioned",
      "# automatically alongside DATABASE_URL by the Vercel Postgres (Neon)",
      "# integration. If unset, the migrate script falls back to DATABASE_URL.",
      "# Example: postgres://user:password@host/dbname?sslmode=require",
    ],
    value: "",
  },
};

function findLineIndex(lines, key) {
  return lines.findIndex((line) => new RegExp(`^#?\\s*${key}=`).test(line));
}

// Comment lines immediately preceding the KEY= line belong to it and get
// replaced along with it; walks upward from lineIndex while lines start
// with "#" and stops at the first blank line or non-comment line.
function findBlockStart(lines, lineIndex) {
  let start = lineIndex;

  while (start > 0 && lines[start - 1].startsWith("#")) {
    start -= 1;
  }

  return start;
}

function applyOverride(lines, key, override) {
  const lineIndex = findLineIndex(lines, key);
  const newBlock = [...override.comment, `${key}=${override.value}`];

  if (lineIndex === -1) {
    return [...lines, "", ...newBlock];
  }

  const blockStart = findBlockStart(lines, lineIndex);

  return [...lines.slice(0, blockStart), ...newBlock, ...lines.slice(lineIndex + 1)];
}

function buildEnvVercelExample() {
  const header = [
    "# Generated by `pnpm scaffold vercel` from .env.example — see that file for",
    "# anything not called out below. Re-run the scaffold command any time to",
    "# pick up new vars added to .env.example since (it won't overwrite this",
    "# file if it already exists, so remove it first if you want a fresh copy).",
    "#",
    "# This is a reference for what to set in Vercel's dashboard (Project",
    "# Settings > Environment Variables) — Vercel doesn't read this file itself.",
    "",
  ];

  let lines = stripDevOnlyBlocks(readFileSync(envExamplePath, "utf8").split("\n"));

  for (const [key, override] of Object.entries(ENV_OVERRIDES)) {
    lines = applyOverride(lines, key, override);
  }

  return [...header, ...lines].join("\n");
}

function addScriptsToPackageJson() {
  const raw = readFileSync(packageJsonPath, "utf8");
  const packageJson = JSON.parse(raw);
  let added = false;

  for (const [name, command] of Object.entries(SCRIPTS_TO_ADD)) {
    if (packageJson.scripts[name]) {
      console.log(`[scaffold:vercel] package.json already has a "${name}" script — leaving it as-is.`);
      continue;
    }

    packageJson.scripts[name] = command;
    added = true;
    console.log(`[scaffold:vercel] Added "${name}" script to package.json.`);
  }

  if (added) {
    // Preserve the file's existing 2-space/trailing-newline formatting rather
    // than reformatting the whole file.
    writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);
  }
}

function writeEnvVercelExample() {
  if (existsSync(envVercelExamplePath)) {
    console.log("[scaffold:vercel] .env.vercel.example already exists — leaving it as-is.");
    return;
  }

  writeFileSync(envVercelExamplePath, buildEnvVercelExample());
  console.log("[scaffold:vercel] Wrote .env.vercel.example.");
}

export async function scaffold() {
  addScriptsToPackageJson();
  writeEnvVercelExample();

  console.log(
    "\n[scaffold:vercel] Done. Next steps:\n" +
      "  1. Set the variables listed in .env.vercel.example in your Vercel project's\n" +
      "     dashboard (Project Settings > Environment Variables) — or add the Vercel\n" +
      "     Postgres (Neon) integration from the Storage tab to have DATABASE_URL /\n" +
      "     DATABASE_URL_UNPOOLED provisioned for you automatically.\n" +
      "  2. If deploying a preview/branch that BigCommerce's servers need to reach\n" +
      "     (e.g. during app installation), disable or scope Vercel's Deployment\n" +
      "     Protection for that branch under Project Settings > Deployment Protection —\n" +
      "     otherwise BigCommerce's server-to-server callbacks get redirected to\n" +
      "     Vercel's SSO gate instead of reaching the app.\n",
  );
}
