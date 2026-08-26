// Cloudflare profile checks. The expectations below mirror
// scripts/cloudflare/scaffold.mjs — when they disagree, the scaffold wins, and
// this file should be updated to match.

import { exists, git, progressOf, readPackageJson, readText, sameContent } from "../shared.mjs";

const DEPENDENCIES = { dependencies: ["@opennextjs/cloudflare"], devDependencies: ["wrangler"] };
const SCRIPTS = ["preview", "deploy", "upload", "cf-typegen", "d1:migrate", "d1:migrate:remote"];
const PLACEHOLDER = "{{CREDENTIALS_DB_NAME}}";
const TEMPLATES_DIR = "scripts/cloudflare/templates";
const TEMPLATES = [
  { template: "dev.vars.example", destination: ".dev.vars.example" },
  { template: "env.production.local.example", destination: ".env.production.local.example" },
  { template: "secrets.production.example", destination: ".secrets.production.example" },
  { template: "wrangler.jsonc.example", destination: "wrangler.jsonc.example" },
  { template: "open-next.config.ts.template", destination: "open-next.config.ts" },
];
const D1_LOADER = "src/lib/credentials-store/d1-driver-loader.ts";
const D1_LOADER_TEMPLATE = `${TEMPLATES_DIR}/d1-driver-loader.ts.template`;
const SECRET_FILES = [".dev.vars", ".secrets.production", ".env.production.local"];

function readD1Loader(root) {
  if (!exists(root, D1_LOADER)) {
    return "missing";
  }

  if (sameContent(root, D1_LOADER, D1_LOADER_TEMPLATE)) {
    return "cloudflare";
  }

  const source = readText(root, D1_LOADER);

  return !source.includes("getCloudflareContext") && source.includes("throw new Error(") ? "core" : "customized";
}

export function analyze(root, { cacheComponents }) {
  const packageJson = readPackageJson(root);
  const proxy = exists(root, "src/proxy.ts");
  const middleware = exists(root, "src/middleware.ts");
  const d1Loader = readD1Loader(root);

  const files = TEMPLATES.map(({ template, destination }) => {
    const present = exists(root, destination);

    return {
      destination,
      present,
      matchesTemplate: present && sameContent(root, destination, `${TEMPLATES_DIR}/${template}`),
    };
  });

  const dependencies = Object.entries(DEPENDENCIES).flatMap(([group, names]) =>
    names.map((name) => ({
      name,
      group,
      declared: Boolean(packageJson[group]?.[name]),
      installed: exists(root, `node_modules/${name}/package.json`),
    })),
  );

  const scripts = SCRIPTS.map((name) => ({
    name,
    present: Boolean(packageJson.scripts?.[name]),
    hasPlaceholder: Boolean(packageJson.scripts?.[name]?.includes(PLACEHOLDER)),
  }));

  const steps = {
    cacheComponentsDisabled: cacheComponents === false,
    middlewareRenamed: middleware && !proxy,
    d1LoaderInstalled: d1Loader === "cloudflare",
    filesWritten: files.every((file) => file.present),
    dependenciesDeclared: dependencies.every((dependency) => dependency.declared),
    scriptsAdded: scripts.every((script) => script.present),
  };

  return {
    progress: progressOf(steps),
    steps,
    proxy,
    middleware,
    d1Loader,
    files,
    dependencies,
    scripts,
    wranglerConfig: exists(root, "wrangler.jsonc"),
    secrets: SECRET_FILES.map((file) => ({
      file,
      ignored: git(root, ["check-ignore", "-q", file]) !== undefined,
    })),
  };
}

export function preflight(state, { item, needsInput }) {
  Object.entries(state.steps).forEach(([step, done]) => item(`${done ? "done   " : "pending"} ${step}`));

  if (state.proxy && state.middleware) {
    item("Both src/proxy.ts and src/middleware.ts exist — the scaffold keeps middleware.ts and leaves proxy.ts in place; only one should carry the authorization gate.");
  }

  if (state.d1Loader === "customized") {
    item(`${D1_LOADER} differs from both the core stub and the Cloudflare template — the scaffold OVERWRITES it.`);
    needsInput();
  }

  state.files
    .filter((file) => file.present && !file.matchesTemplate)
    .forEach((file) => item(`${file.destination} exists and differs from its template — the scaffold leaves it as-is.`));
}

export function verify(state, check) {
  for (const [step, done] of Object.entries(state.steps)) {
    check(done ? "PASS" : "FAIL", `Scaffold step ${step}`);
  }

  if (state.proxy && state.middleware) {
    check("WARN", "Both src/proxy.ts and src/middleware.ts exist. Only middleware.ts is bundled by OpenNext.");
  }

  state.files
    .filter((file) => file.present && !file.matchesTemplate)
    .forEach((file) => check("WARN", `${file.destination} predates this run and differs from its template (left as-is).`));

  state.dependencies
    .filter((dependency) => dependency.declared && !dependency.installed)
    .forEach((dependency) => check("WARN", `${dependency.name} is declared but not installed — run \`pnpm install\`.`));

  const placeholders = state.scripts.filter((script) => script.hasPlaceholder).map((script) => script.name);

  if (placeholders.length > 0) {
    check("WARN", `Expected follow-up: replace ${PLACEHOLDER} in the ${placeholders.join(" and ")} script(s).`);
  }

  if (!state.wranglerConfig) {
    check("WARN", "Expected follow-up: copy wrangler.jsonc.example to wrangler.jsonc and fill in its placeholders.");
  }

  state.secrets.forEach(({ file, ignored }) =>
    check(ignored ? "PASS" : "FAIL", `${file} is ${ignored ? "" : "NOT "}gitignored.`),
  );
}
