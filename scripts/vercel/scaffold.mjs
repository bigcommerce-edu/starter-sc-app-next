// TODO: scaffold this app for deployment on Vercel, using the existing
// Postgres credentials-store driver against Neon or any standard Postgres
// server. Run via `pnpm scaffold vercel`.
//
// Idempotent: safe to re-run (e.g. after pulling upstream changes) — it
// should only add what's missing, and never overwrite a script/file a dev
// may have already customized.
//
//  - SCRIPTS_TO_ADD: { "db:postgres:migrate": "node scripts/postgres/migrate.mjs",
//    "vercel-build": "pnpm db:postgres:migrate && next build" }
//  - addScriptsToPackageJson(): reads package.json, adds each missing
//    script from SCRIPTS_TO_ADD (logging and skipping any that already
//    exist), rewrites the file preserving 2-space/trailing-newline
//    formatting only if something was actually added
//  - buildEnvVercelExample(): builds .env.vercel.example's contents from
//    .env.example
//     - strip every "# DEV ONLY START"/"# DEV ONLY END" block (inclusive) -
//       those mark vars that only matter for local dev (MOCK/STATIC modes,
//       the SQLite driver) and have no meaning in a real deployed profile
//       like this one; collapse any resulting run of 2+ blank lines down to 1
//     - override DATA_MODE to MULTITENANT, CREDENTIALS_STORE_DRIVER to
//       POSTGRES, and add DATABASE_URL/DATABASE_URL_UNPOOLED placeholders
//       with Vercel/Neon-specific comments, replacing each var's existing
//       comment + value line (or appending a new block if the var isn't
//       present at all) - matched by the KEY= line itself, not by a fixed
//       line number, so this keeps working if .env.example gains/reorders
//       vars later
//     - prepend a header noting this file was generated from .env.example
//       and won't be overwritten if it already exists
//  - writeEnvVercelExample(): no-ops (with a log line) if .env.vercel.example
//    already exists, otherwise writes buildEnvVercelExample()'s result
//  - export async function scaffold(): calls addScriptsToPackageJson() then
//    writeEnvVercelExample(), then logs next-step instructions (set the
//    listed vars in Vercel's dashboard or add the Vercel Postgres/Neon
//    integration; disable/scope Deployment Protection for branches
//    BigCommerce's servers need to reach)
