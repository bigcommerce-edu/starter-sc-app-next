# Deploying to Vercel

This guide covers deploying this app to Vercel as a hosted BigCommerce
single-click app, backed by a Neon Postgres database.

This is step 4 of the four-step strategy in the
[README](../README.md#getting-started). Working through
[Running Locally as a Single-Click App](./LOCAL-SINGLE-CLICK-APP.md) first is
recommended but not required — the concepts (`MULTITENANT` mode,
`APP_ORIGIN`, the developer portal callbacks) are the same, with a real host
and a real database in place of a tunnel and a SQLite file.

## Why Postgres Is Required

Vercel runs your app across multiple short-lived instances with an ephemeral
filesystem. The SQLite driver used for local development writes to a local
file, so each instance would get its own database and any of them could
vanish between requests. The Postgres driver
(`src/lib/credentials-store/postgres-driver/`) is the multi-instance
counterpart: one shared remote database every instance can see.

## Deployment Order

The steps below are ordered around a chicken-and-egg problem: `APP_ORIGIN`
and the developer portal's callback URLs both need the deployment's final
URL, which doesn't exist until you've deployed at least once.

The order works around that by deploying first in `MOCK` mode — which needs
no BigCommerce credentials and no database — verifying the deployment is
healthy, then layering on the real configuration:

1. [Scaffold the Vercel tooling](#1-scaffold-the-vercel-tooling) and commit
   it.
2. [Deploy in MOCK mode](#2-deploy-in-mock-mode) and get the project's URL.
3. [Verify the deployment](#3-verify-the-deployment-in-mock-mode).
4. [Set up Postgres](#4-set-up-a-neon-postgres-database).
5. [Register the app](#5-register-the-app-in-the-developer-portal) in the
   developer portal.
6. [Set the remaining env vars](#6-set-the-remaining-environment-variables)
   and switch to `MULTITENANT`.
7. [Redeploy and install](#7-redeploy-and-install).

## 1. Scaffold the Vercel Tooling

Hosting-specific tooling is opt-in rather than baked into the base app, so
this starter can target any provider. Add the Vercel profile:

```shell
pnpm scaffold vercel
```

This adds two `package.json` scripts and one reference file:

* `db:postgres:migrate` — runs the Postgres migrations in
  `src/lib/credentials-store/postgres-driver/migrations/`.
* `vercel-build` — `pnpm db:postgres:migrate && next build`. Vercel prefers
  this over `build` automatically, so migrations run on every deploy.
* `.env.vercel.example` — a generated reference listing exactly what to set
  in Vercel's dashboard, with local-development-only variables stripped out
  and the production values for `DATA_MODE` and `CREDENTIALS_STORE_DRIVER`
  filled in. Vercel does not read this file; it's for you.

The command is idempotent and won't overwrite anything you've customized, so
it's safe to re-run after pulling upstream changes.

Commit the result — Vercel builds from your Git repository, so the
`vercel-build` script has to be in the commit you deploy:

```shell
git add package.json .env.vercel.example
git commit -m "Add Vercel deployment scaffolding"
git push
```

The migrate script keys only on `DATABASE_URL_UNPOOLED`/`DATABASE_URL` being
set, not on `DATA_MODE`. With neither set yet, it logs a skip and exits
successfully, which is what makes the `MOCK`-mode first deploy below work
before any database exists.

## 2. Deploy in MOCK Mode

1. In the [Vercel dashboard](https://vercel.com/new), import your Git
   repository as a new project.
2. Leave the framework preset (Next.js) and build settings at their
   defaults.
3. Before deploying, add one environment variable under **Environment
   Variables**:

   ```dotenv
   DATA_MODE=MOCK
   ```

   `MOCK` is the default when unset, but setting it explicitly makes the
   intermediate state obvious to anyone looking at the project later.

4. Deploy.

Once the build finishes, get the project's URL from the project overview —
Vercel assigns a production domain of the form
`https://<project-name>.vercel.app`. Use that stable production domain, not
a per-deployment URL (those include a unique hash and change on every
deploy).

## 3. Verify the Deployment in MOCK Mode

Open the production URL. In `MOCK` mode the root-level routes under
`app/(root)` serve real content, so you should see the gift certificates
list rendered with in-memory mock data, a data-mode banner, and working
navigation to the customers pages.

This confirms the build, the runtime, and the UI all work on Vercel before
any BigCommerce or database configuration is involved. If something is
broken here, it's a build or hosting problem, not an auth or database one —
a much smaller thing to debug.

## 4. Set Up a Neon Postgres Database

1. In your Vercel project, open the **Storage** tab.
2. Create a database, choosing **Neon** (Serverless Postgres) from the
   marketplace options, and connect it to this project.

Connecting the database provisions its connection strings as environment
variables on the project automatically, including the two this app uses:

* `DATABASE_URL` — the pooled (PgBouncer) connection, used by the app for
  every request-time query.
* `DATABASE_URL_UNPOOLED` — the direct connection, used only by the migrate
  script. Schema migrations are exactly the kind of session-level DDL work
  that transaction-mode pooling can misbehave with, and there's no pooling
  benefit to lose for a command that runs once per deploy.

If you'd rather use your own Postgres server than Neon, set those two
variables by hand instead; the driver is a plain libpq client with nothing
Neon-specific in it. Against an unpooled server, also consider setting
`DATABASE_POOL_MAX` to something low (2–5) so several warm instances don't
exhaust the server's connection limit.

Migrations don't need to be run by hand. The `vercel-build` script runs them
before each `next build`, so the schema is created on your next deploy.

## 5. Register the App in the Developer Portal

Create the app record in the
[BigCommerce developer portal](https://build.bigcommerce.com/) and point
its callbacks at the Vercel production URL.

1. Create a new app (or reuse the draft app from local development — but
   note that its callback URLs point at your tunnel, so either update them
   or keep a separate app record per environment; a separate record is
   cleaner, since it lets local and deployed installs coexist).
2. On the **Technical** tab, set the callback URLs, substituting your
   production domain for `<APP_ORIGIN>`:

   | Callback | URL |
   | --- | --- |
   | Auth | `<APP_ORIGIN>/api/app/auth` |
   | Load | `<APP_ORIGIN>/api/app/load` |
   | Uninstall | `<APP_ORIGIN>/api/app/uninstall` |
   | Remove User | `<APP_ORIGIN>/api/app/remove_user` |

3. On the **Scopes** tab, enable at minimum: **Information & Settings**
   (read-only), **Customers** (modify), **Marketing** (modify), and **App
   Extensions** (manage). Scope changes take effect on the next install, so
   changing them later means uninstalling and reinstalling.
4. Copy the **Client ID** and **Client Secret** for the next step.

See the [local guide](./LOCAL-SINGLE-CLICK-APP.md#registering-the-app-in-the-developer-portal)
for more detail on the app profile and what each scope is for.

## 6. Set the Remaining Environment Variables

In **Project Settings > Environment Variables**, set the following for the
Production environment. `.env.vercel.example` is the generated reference for
this list.

| Variable | Value |
| --- | --- |
| `DATA_MODE` | `MULTITENANT` (changed from `MOCK`) |
| `CREDENTIALS_STORE_DRIVER` | `POSTGRES` |
| `APP_ORIGIN` | Your Vercel production URL, no trailing slash |
| `BIGCOMMERCE_CLIENT_ID` | From the developer portal |
| `BIGCOMMERCE_CLIENT_SECRET` | From the developer portal |
| `SESSION_SECRET` | Generated (see below) |
| `CREDENTIALS_ENCRYPTION_KEY` | Generated (see below) |
| `DEVELOPER_NAME`, `SUPPORT_EMAIL`, `SUPPORT_URL`, `SUPPORT_PHONE`, `DEVELOPER_LOGO_FILENAME` | Your own branding, shown in the app shell |

`DATABASE_URL` and `DATABASE_URL_UNPOOLED` should already be present from
step 4.

Generate each secret separately:

```shell
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```

Use fresh values rather than reusing your local ones, and treat them as
production secrets. Note that `CREDENTIALS_ENCRYPTION_KEY` encrypts stored
access tokens at rest — changing it later makes every already-stored token
undecryptable, forcing every store to reinstall.

`APP_ORIGIN` must exactly match the origin in the developer portal's Auth
callback URL. It's the source of truth for the OAuth `redirect_uri` and is
never derived from the incoming request, since behind Vercel's proxy the
observed host isn't guaranteed to match the public origin BigCommerce
called.

Two `CREDENTIALS_STORE_DRIVER` notes:

* It's read at build time as well as runtime. `next.config.ts` aliases the
  Postgres driver away to a `pg`-free stub unless this is `POSTGRES`, so it
  has to be set before the build that needs the real driver — which is why
  the redeploy in the next step matters.
* The migrate script ignores it entirely and keys on the database URLs, so
  migrations run as soon as the database is connected.

## 7. Redeploy and Install

Environment variable changes don't apply to an existing deployment. Trigger
a fresh one — from the **Deployments** tab, redeploy the latest commit, or
push a commit.

Watch the build log to confirm the migration step ran (`node-pg-migrate`
output rather than the "skipping Postgres migrations" line). That's the
schema being created in Neon.

Then install the app:

1. In your store's control panel, go to **Apps > My Apps > My Draft Apps**
   and install your app.
2. BigCommerce calls `/api/app/auth`, which exchanges the code for a token,
   persists the store to Postgres, registers the app extension, and
   redirects into `/store/<storeHash>/`.
3. Confirm the app renders in the control panel iframe with real store data.

### Deployment Protection

If you're deploying a preview or branch deployment that BigCommerce needs to
reach, disable or scope Vercel's Deployment Protection for it under
**Project Settings > Deployment Protection**. Otherwise BigCommerce's
server-to-server callbacks hit Vercel's SSO gate instead of your app, and
installs fail in a way that looks like an app bug. Production deployments
aren't protected by default.

## Troubleshooting

**The build fails on `pg` or `pg-cloudflare`.** `CREDENTIALS_STORE_DRIVER`
wasn't `POSTGRES` at build time, or a build cache predates the change.
Confirm the variable and redeploy.

**Install redirects to an app error page.** Check the reason on
`/app-error?reason=...` and the Vercel runtime logs. A token exchange
failure means credentials or a `redirect_uri`/`APP_ORIGIN` mismatch; a save
failure means the database — confirm `DATABASE_URL` is set and migrations
ran.

**The app installs but every page is unauthorized.** Usually the session
cookie: it requires HTTPS and a correct `APP_ORIGIN`. Confirm `APP_ORIGIN`
matches the domain you're actually being served from.

**Migrations never run.** The build log shows "skipping Postgres
migrations" when neither database URL is set. Reconnect the Neon
integration, or set the variables manually.

## Checklist: Pointing a Real Domain at Your App

Once you attach a custom domain (e.g. `https://app.example.com`) to the
Vercel project, the app's public origin changes — and several things that
hardcode the old `*.vercel.app` origin have to be updated together. A
partial update leaves the app in a state where installs fail or sessions
break, so treat this as one atomic change:

1. **Add and verify the domain** in **Project Settings > Domains**, and
   confirm it serves the app over HTTPS.
2. **Update `APP_ORIGIN`** to the new origin, with no trailing slash. This
   also updates the Server Action allow-list in `next.config.ts`, which
   reads `APP_ORIGIN` at build time.
3. **Update all four callback URLs** in the developer portal to the new
   origin: `/api/app/auth`, `/api/app/load`, `/api/app/uninstall`, and
   `/api/app/remove_user`. The Auth callback in particular must match
   `APP_ORIGIN` exactly or the OAuth token exchange is rejected.
4. **Redeploy**, so the new `APP_ORIGIN` is picked up at both build and
   runtime.
5. **Reinstall the app** in any store that had it installed under the old
   origin. Existing installs and app extensions still reference the old URL,
   and the app extension's registered URL is what the control panel menu
   item points at.
6. **Verify** a fresh install and a launch (`/api/app/load`) both work on
   the new domain, and that the control-panel menu item lands on it.

If you keep the `*.vercel.app` domain working alongside the custom one, be
aware only one can be `APP_ORIGIN`. Requests arriving on the other will
still render, but redirects and the OAuth `redirect_uri` will point at
`APP_ORIGIN` — which is why installs must be done against the canonical
domain.
