#!/usr/bin/env node
// Rehearses the cache swap in a throwaway git worktree, so its real output can
// be read, linted, and typechecked without touching the developer's tree. The
// swap writes files before it validates, so this is the only safe way to see
// what it would do to a tree that might not swap cleanly.
//
// The worktree starts at HEAD, then gets the developer's uncommitted tracked
// changes and untracked (non-ignored) files copied in, so remediation edits
// that haven't been committed yet are rehearsed too. Ignored files — including
// every local secret file — are never copied. node_modules is symlinked from
// the repo, not reinstalled.
//
// Rehearses the swap plus `cacheComponents: false`, not the whole Cloudflare
// scaffold: the scaffold's other steps add dependencies that aren't installed
// yet, which would fail the typecheck for reasons unrelated to the swap.
//
// Usage (from the repo root):
//   node .agents/skills/scaffold-hosting/scripts/rehearse.mjs [--keep]

import { execFileSync, spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { analyze, formatFinding } from "./analyze.mjs";

const LOG_PREFIX = "[scaffold-hosting:rehearse]";
const repoRoot = process.cwd();
const keep = process.argv.includes("--keep");

function log(message) {
  console.log(`${LOG_PREFIX} ${message}`);
}

function git(args, options = {}) {
  return execFileSync("git", args, { cwd: repoRoot, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, ...options });
}

// Runs a command, never throwing, and returns its combined output.
function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });

  return { ok: result.status === 0, output: `${result.stdout ?? ""}${result.stderr ?? ""}`.trimEnd() };
}

function tail(text, lines = 40) {
  const all = text.split("\n");

  return all.length > lines ? [`… (${all.length - lines} earlier lines omitted)`, ...all.slice(-lines)].join("\n") : text;
}

if (!existsSync(path.join(repoRoot, "node_modules"))) {
  console.error(`${LOG_PREFIX} node_modules is missing — run \`pnpm install\` first.`);
  process.exit(1);
}

const workDir = mkdtempSync(path.join(os.tmpdir(), "scaffold-hosting-rehearsal-"));
const worktree = path.join(workDir, "tree");
const patchPath = path.join(workDir, "swap.patch");

git(["worktree", "add", "--detach", "--quiet", worktree, "HEAD"]);
log(`Created a temporary worktree at ${worktree}`);

let exitCode = 0;

try {
  // --- Copy the developer's uncommitted work in ---
  const trackedDiff = git(["diff", "HEAD", "--binary"]);

  if (trackedDiff.trim() !== "") {
    execFileSync("git", ["apply", "--whitespace=nowarn"], { cwd: worktree, input: trackedDiff });
    log("Applied uncommitted changes to tracked files.");
  }

  const untracked = git(["ls-files", "--others", "--exclude-standard", "-z"]).split("\0").filter(Boolean);

  for (const file of untracked) {
    mkdirSync(path.dirname(path.join(worktree, file)), { recursive: true });
    copyFileSync(path.join(repoRoot, file), path.join(worktree, file));
  }

  if (untracked.length > 0) {
    log(`Copied ${untracked.length} untracked file(s).`);
  }

  symlinkSync(path.join(repoRoot, "node_modules"), path.join(worktree, "node_modules"), "dir");

  // Stage the starting point, so the swap's own changes are exactly the
  // unstaged diff afterwards.
  execFileSync("git", ["add", "-A"], { cwd: worktree });

  // --- Swap ---
  const swap = run(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      "import { swapToFetchCaching } from './scripts/cache-swap/swap-to-fetch-caching.mjs'; swapToFetchCaching();",
    ],
    worktree,
  );

  console.log(`\n== Swap output ==\n${swap.output}`);

  if (!swap.ok) {
    exitCode = 1;
    log("The swap FAILED. In a real run, files written before the failure would be left half-swapped.");
  }

  const configPath = path.join(worktree, "next.config.ts");
  const config = readFileSync(configPath, "utf8");

  writeFileSync(configPath, config.replace(/cacheComponents:\s*true/, "cacheComponents: false"));

  // --- Diff ---
  const diff = execFileSync("git", ["diff"], { cwd: worktree, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });

  writeFileSync(patchPath, diff);
  console.log(`\n== Changes (full patch: ${patchPath}) ==\n${run("git", ["diff", "--stat"], worktree).output || "(none)"}`);

  // --- Static checks on the swapped tree ---
  const after = analyze(worktree);
  const leftovers = after.findings.filter((finding) => finding.code === "U1" || finding.code === "U2");

  console.log(`\n== Swapped tree ==\n  State: ${after.cacheState.state}`);
  after.cacheState.reasons.forEach((reason) => console.log(`    ${reason}`));

  if (leftovers.length > 0) {
    exitCode = 1;
    console.log("  Cache Components code still present:");
    leftovers.forEach((finding) => console.log(`    ${formatFinding(finding)}`));
  }

  if (swap.ok) {
    const bin = (name) => path.join(worktree, "node_modules", ".bin", name);
    const checks = [
      ["next typegen", bin("next"), ["typegen"]],
      ["tsc --noEmit", bin("tsc"), ["--noEmit"]],
      ["eslint", bin("eslint"), []],
    ];

    for (const [label, command, args] of checks) {
      const result = run(command, args, worktree);

      console.log(`\n== ${label}: ${result.ok ? "PASS" : "FAIL"} ==`);

      if (!result.ok) {
        exitCode = 1;
        console.log(tail(result.output));
      }
    }
  }
} finally {
  if (keep) {
    log(`Kept the worktree. Remove it with: git worktree remove --force "${worktree}"`);
  } else {
    git(["worktree", "remove", "--force", worktree]);
    log(`Removed the temporary worktree (the patch is kept at ${patchPath}).`);
  }
}

process.exit(exitCode);
