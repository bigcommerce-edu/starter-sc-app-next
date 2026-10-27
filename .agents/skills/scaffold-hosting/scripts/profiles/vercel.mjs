// Vercel profile checks. The expectations below mirror
// scripts/vercel/scaffold.mjs — when they disagree, the scaffold wins, and
// this file should be updated to match.

import { exists, progressOf, readPackageJson, readText } from "../shared.mjs";

const SCRIPTS = {
  "db:postgres:migrate": "node scripts/postgres/migrate.mjs",
  "vercel-build": "pnpm db:postgres:migrate && next build",
};
const ENV_EXAMPLE = ".env.vercel.example";
const ENV_SOURCE = ".env.example";
const EXPECTED_VALUES = { DATA_MODE: "MULTITENANT", CREDENTIALS_STORE_DRIVER: "POSTGRES" };

function envKeys(lines) {
  return lines.map((line) => line.match(/^#?\s*([A-Z][A-Z0-9_]*)=/)?.[1]).filter(Boolean);
}

// .env.example without its DEV ONLY blocks: what the scaffold copies.
function productionSourceLines(root) {
  if (!exists(root, ENV_SOURCE)) {
    return [];
  }

  const lines = [];
  let inDevOnly = false;

  for (const line of readText(root, ENV_SOURCE).split("\n")) {
    if (line.trim() === "# DEV ONLY START") {
      inDevOnly = true;
    } else if (line.trim() === "# DEV ONLY END") {
      inDevOnly = false;
    } else if (!inDevOnly) {
      lines.push(line);
    }
  }

  return lines;
}

function analyzeEnvExample(root) {
  const env = { present: exists(root, ENV_EXAMPLE), missingKeys: [], devOnlyMarkersLeft: false, unexpectedValues: [] };

  if (!env.present) {
    return env;
  }

  const generated = readText(root, ENV_EXAMPLE).split("\n");
  const generatedKeys = new Set(envKeys(generated));

  env.missingKeys = envKeys(productionSourceLines(root)).filter((key) => !generatedKeys.has(key));
  env.devOnlyMarkersLeft = generated.some((line) => line.trim().startsWith("# DEV ONLY"));

  for (const [key, expected] of Object.entries(EXPECTED_VALUES)) {
    const line = generated.find((candidate) => candidate.startsWith(`${key}=`));
    const actual = line ? line.slice(key.length + 1).trim() : "(unset)";

    if (actual !== expected) {
      env.unexpectedValues.push({ key, expected, actual });
    }
  }

  return env;
}

export function analyze(root) {
  const packageJson = readPackageJson(root);
  const scripts = Object.entries(SCRIPTS).map(([name, command]) => ({
    name,
    present: Boolean(packageJson.scripts?.[name]),
    customized: Boolean(packageJson.scripts?.[name]) && packageJson.scripts[name] !== command,
  }));
  const env = analyzeEnvExample(root);

  return {
    progress: progressOf({
      ...Object.fromEntries(scripts.map((script) => [script.name, script.present])),
      envExample: env.present,
    }),
    scripts,
    env,
  };
}

export function preflight(state, { item }) {
  state.scripts.forEach((script) =>
    item(`${script.present ? "done   " : "pending"} "${script.name}" script${script.customized ? " (customized — left as-is)" : ""}`),
  );
  item(`${state.env.present ? "done   " : "pending"} ${ENV_EXAMPLE}`);

  if (state.env.missingKeys.length > 0) {
    item(`${ENV_EXAMPLE} is stale — missing ${state.env.missingKeys.join(", ")}. The scaffold won't regenerate an existing file.`);
  }
}

export function verify(state, check) {
  state.scripts.forEach((script) =>
    check(
      script.present ? (script.customized ? "WARN" : "PASS") : "FAIL",
      `"${script.name}" script ${script.present ? (script.customized ? "present but customized" : "present") : "missing"}.`,
    ),
  );

  if (!state.env.present) {
    check("FAIL", `${ENV_EXAMPLE} was not written.`);

    return;
  }

  check("PASS", `${ENV_EXAMPLE} exists.`);

  if (state.env.devOnlyMarkersLeft) {
    check("FAIL", `${ENV_EXAMPLE} still contains DEV ONLY markers.`);
  }

  state.env.unexpectedValues.forEach(({ key, expected, actual }) =>
    check("WARN", `${ENV_EXAMPLE} sets ${key}=${actual}, expected ${expected}.`),
  );

  if (state.env.missingKeys.length > 0) {
    check("WARN", `${ENV_EXAMPLE} is missing ${state.env.missingKeys.join(", ")} from ${ENV_SOURCE} (stale copy?).`);
  }
}
