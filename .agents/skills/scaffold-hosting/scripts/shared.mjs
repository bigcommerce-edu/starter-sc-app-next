// Read-only file and git helpers shared by analyze.mjs and the profile modules
// in profiles/. Never writes a file.

import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";

export function exists(root, relativePath) {
  return existsSync(path.join(root, relativePath));
}

export function readText(root, relativePath) {
  return readFileSync(path.join(root, relativePath), "utf8");
}

export function readJson(root, relativePath) {
  return JSON.parse(readText(root, relativePath));
}

export function readPackageJson(root) {
  try {
    return readJson(root, "package.json");
  } catch {
    return { scripts: {}, dependencies: {}, devDependencies: {} };
  }
}

export function sameContent(root, a, b) {
  return exists(root, a) && exists(root, b) && readText(root, a) === readText(root, b);
}

// Returns stdout, or undefined if git fails or isn't installed. A non-zero exit
// is how `git check-ignore -q` says "not ignored", so callers test for that.
export function git(root, args) {
  try {
    return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    return undefined;
  }
}

// "none", "partial", or "complete", from a map of step name → done.
export function progressOf(steps) {
  const done = Object.values(steps).filter(Boolean).length;

  return done === 0 ? "none" : done === Object.keys(steps).length ? "complete" : "partial";
}
