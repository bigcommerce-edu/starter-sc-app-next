# Running Locally as a Single-Click App

This guide covers running this app on your own machine as a real
BigCommerce single-click app — installed into a store, launched from that
store's control panel, and authenticated through the full OAuth install and
session flow.

This is step 3 of the four-step strategy in the
[README](../README.md#getting-started). It assumes you already have the app
running locally in `MOCK` or `STATIC` mode.

Three things have to be true before a store can install your local app:

* Your `localhost` dev server is reachable at a **public HTTPS URL**, since
  BigCommerce's servers call your app back over the internet and render it
  in an iframe.
* An app is registered in the BigCommerce Developer Portal, pointing its
  callback URLs at that public URL.
* The app runs in `MULTITENANT` mode, so it looks up a per-store API token
  from durable storage instead of using mock data or one static token.

The sections below work through those in order, then cover installing and
launching.

## Exposing Localhost Over HTTPS

BigCommerce needs a public, fully-qualified HTTPS URL for both the
server-to-server callbacks and the control-panel iframe, so a bare
`http://localhost:3000` won't work. Pick one of the three options below.

Whichever you choose, note that most free tunneling services issue a **new
URL every time you restart the tunnel**. When the URL changes you have to
update both `APP_ORIGIN` in `.env.local` and the callback URLs in the
developer portal, then restart the dev server. Keeping a tunnel running for
the length of a work session saves a lot of re-editing.

### Option 1: VS Code Port Forwarding

Built into VS Code and free with a GitHub account. No extra software.

1. Start the dev server (`pnpm dev`) so something is listening on port
   3000.
2. Open the **Ports** view (the **Ports** tab next to the terminal, or the
   *Ports: Focus on Ports View* command).
3. Choose **Forward a Port** and enter `3000`.
4. Sign in with GitHub when prompted.
5. Right-click the forwarded port, and under **Port Visibility** choose
   **Public**. This is required — a private port is only reachable by your
   own authenticated browser, so BigCommerce's servers would get a login
   page instead of your app.
6. Copy the generated `https://<something>.devtunnels.ms` URL and use it as
   `APP_ORIGIN`.

### Option 2: GitHub Codespaces

Runs the whole project in a cloud dev container, which is useful if you'd
rather not install Node locally or want a disposable environment.

1. Fork or clone this repository into your own GitHub account.
2. From the repository page on GitHub, choose **Code > Codespaces > Create
   codespace on main**.
3. In the Codespace terminal, install dependencies and copy the env file:

   ```shell
   pnpm install
   cp .env.example .env.local
   ```

4. Run `pnpm dev`. Codespaces auto-forwards port 3000 and shows a
   notification with the URL.
5. In the **Ports** view, right-click port 3000 and set **Port Visibility**
   to **Public**, for the same reason as above.
6. Copy the `https://<codespace-name>-3000.app.github.dev` URL and use it
   as `APP_ORIGIN`.

Codespaces stop when idle. On restart the forwarded URL is usually stable
for the life of the Codespace, but its visibility can reset to private —
worth re-checking if installs suddenly start failing.

### Option 3: Ngrok

A dedicated tunneling tool, and the option most BigCommerce documentation
assumes. A free account is required for a usable session length.

1. Install ngrok and authenticate it with the token from your ngrok
   dashboard:

   ```shell
   ngrok config add-authtoken <your-token>
   ```

2. Start the dev server (`pnpm dev`).
3. In a second terminal, start the tunnel:

   ```shell
   ngrok http 3000
   ```

4. Copy the `https://<subdomain>.ngrok-free.app` **Forwarding** URL and use
   it as `APP_ORIGIN`.

A reserved ngrok domain (available on paid plans, via `ngrok http --domain`)
gives you a stable URL and removes the re-editing loop entirely.

## Registering the App in the Developer Portal

App registration happens in the
[BigCommerce Developer Portal](https://build.bigcommerce.com/), which is
where you create the app record, get its OAuth credentials, declare its
callback URLs, and pick its scopes. Creating an account there is free and
doesn't require a partnership — see
[Beginning App Development](https://docs.bigcommerce.com/developer/docs/integrations/apps/guide/beginning-development)
for the broader prerequisites (a partnership is only needed to publish to
the marketplace) and
[Managing Apps in the Developer Portal](https://docs.bigcommerce.com/developer/docs/integrations/apps/guide/managing-apps-in-dev-portal)
for a tour of the app profile itself.

You'll also need a store you can install into. A sandbox/trial store is
fine, and you must be able to sign in to its control panel as a user with
permission to install apps.

### Minimal Setup

Only a few fields matter for local development — nothing else in the app
profile is mandatory unless you're preparing for marketplace approval.

1. Create a new app in the developer portal.
2. On the **Technical** tab, set the callback URLs, substituting your
   tunnel URL for `<APP_ORIGIN>`:

   | Callback | URL |
   | --- | --- |
   | Auth | `<APP_ORIGIN>/api/app/auth` |
   | Load | `<APP_ORIGIN>/api/app/load` |
   | Uninstall | `<APP_ORIGIN>/api/app/uninstall` |
   | Remove User | `<APP_ORIGIN>/api/app/remove_user` |

   These paths are the four route handlers under `src/app/api/app/`. The
   Auth callback URL must match `APP_ORIGIN` exactly, since the app sends
   it back to BigCommerce as the OAuth `redirect_uri` during the token
   exchange and BigCommerce rejects a mismatch.

3. On the **Scopes** tab, enable at minimum:

   * **Customers**: modify
   * **Marketing**: modify
   * **Channel Settings**: read-only
   * **Channel Listings**: read-only
   * **Information & Settings**: read-only 
   * **App Extensions**: manage

   Scope changes only take effect for a store on the next install, so if
   you change them later, uninstall and reinstall the app.

4. Copy the **Client ID** and **Client Secret** into `.env.local` as
   `BIGCOMMERCE_CLIENT_ID` and `BIGCOMMERCE_CLIENT_SECRET`.

Keep the app in draft status. A draft app is installable from the control panel of
any store your developer-portal account owns, which is all you need here.

## Switching to MULTITENANT Mode

In `.env.local`, set:

```dotenv
DATA_MODE=MULTITENANT
```

This changes the app's behavior in a few important ways:

* Every request is scoped to a store via the `/store/[storeHash]` route
  segment, and is authenticated by the app's own session cookie.
* The root-level dev routes under `app/(root)` stop serving real content.
  They exist only as a convenience for `MOCK`/`STATIC` development, so in
  `MULTITENANT` mode they render an "unauthorized" warning instead (see
  `src/lib/routing/root-route-guard.tsx`).
* API tokens come from the credentials store rather than
  `STATIC_STORE_TOKEN`.

Leave `CREDENTIALS_STORE_DRIVER=SQLITE` for local development (see
[Local Credentials Storage](#local-credentials-storage) below).

## Environment Variables

`MULTITENANT` mode needs these set in `.env.local`. See `.env.example` for
the full commentary on each one.

| Variable | Where it comes from |
| --- | --- |
| `BIGCOMMERCE_CLIENT_ID` | The Developer Portal, after you create the app |
| `BIGCOMMERCE_CLIENT_SECRET` | The Developer Portal, after you create the app |
| `APP_ORIGIN` | Your public HTTPS tunnel URL, with no trailing slash |
| `SESSION_SECRET` | Generated locally (see below) |
| `CREDENTIALS_ENCRYPTION_KEY` | Generated locally (see below) |

Generate the two secrets with:

```shell
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```

Run it once per variable so they get different values. `SESSION_SECRET`
signs this app's own session cookie; `CREDENTIALS_ENCRYPTION_KEY` encrypts
stored store access tokens at rest. Neither is interchangeable with
`BIGCOMMERCE_CLIENT_SECRET`, which is only used to verify BigCommerce's
inbound signed payloads.

`APP_ORIGIN` is deliberately never derived from the incoming request — it's
the single source of truth for the OAuth `redirect_uri` and for the app's
own browser-facing redirects (see `src/lib/routing/app-url.ts`). It must
exactly match the origin registered in the developer portal.

## Local Credentials Storage

In `MULTITENANT` mode the app persists a store's access token, its users,
and the store-user links that authorize each session. Locally this is
handled by the SQLite driver
(`src/lib/credentials-store/sqlite-driver/`), selected with:

```dotenv
CREDENTIALS_STORE_DRIVER=SQLITE
```

The database is a plain file at `./data/credentials.sqlite`, created
automatically on first use and gitignored. Set `CREDENTIALS_SQLITE_PATH` to
put it elsewhere. No schema migration step or external service is needed —
the driver creates its tables on demand.

SQLite is a local-development choice only. It's a single file on one
machine's disk, so it can't be shared across the multiple instances a real
deployment runs. Switching to Postgres for a hosted environment is covered
in the [Vercel deployment guide](./VERCEL-DEPLOYMENT.md).

Stored access tokens are encrypted with `CREDENTIALS_ENCRYPTION_KEY`. If you
change that value, previously stored tokens can no longer be decrypted —
delete `data/credentials.sqlite` and reinstall the app.

## Installing and Launching

1. Confirm `.env.local` has `DATA_MODE=MULTITENANT`, both BigCommerce
   credentials, `APP_ORIGIN` set to your current tunnel URL, and both
   generated secrets.
2. Restart `pnpm dev`. Env var changes aren't picked up by a running
   server, and `APP_ORIGIN` is also read at startup to allow-list Server
   Action origins (see `next.config.ts`).
3. Confirm the tunnel is up and public by opening `<APP_ORIGIN>` in a
   browser. In `MULTITENANT` mode you should get the "unauthorized" root
   route warning rather than an error — that means the app is reachable and
   correctly refusing to serve an unscoped route.
4. In your store's control panel, go to **Apps > My Apps > My Draft Apps**,
   find your app, and click **Install**, then approve the requested scopes.
5. BigCommerce calls `/api/app/auth`, which exchanges the code for a token,
   saves the store, mints a session cookie, and redirects into
   `/store/<storeHash>/`. The app then renders inside the control panel
   iframe.
6. Subsequent launches from **Apps > My Apps** call `/api/app/load`, which
   verifies BigCommerce's signed payload and issues a fresh session.

For the underlying protocol, see BigCommerce's
[Single-Click App OAuth Flow](https://docs.bigcommerce.com/developer/docs/integrations/apps/guide/auth).

## Troubleshooting

**The install redirects to an app error page.** The app sends install
failures to `/app-error?reason=...` rather than returning JSON, since
BigCommerce navigates the iframe to the callback directly. The reason
identifies the failing stage — a token exchange failure points at
credentials or a `redirect_uri` mismatch, while a save failure points at the
credentials store. Check the dev server console for the logged error.

**Nothing reaches your app.** The tunnel is down, its URL has changed, or
its visibility is private. Load `<APP_ORIGIN>` directly in a browser to
confirm.

**The app installs but shows an unauthorized page.** The session cookie
isn't surviving the iframe. It's set `SameSite=None; Secure; Partitioned`,
which requires HTTPS — confirm `APP_ORIGIN` is the `https://` tunnel URL
and not `http://localhost:3000`.

**A stale URL somewhere.** After any tunnel URL change, `APP_ORIGIN`, all
four developer-portal callback URLs, and a dev server restart all have to
agree. It's also worth uninstalling and reinstalling the app, since the
stored install is tied to the old origin.

**Server Actions fail as cross-origin.** `next.config.ts` allow-lists
`APP_ORIGIN`'s host, so this usually means the server is running with a
stale value. Restart it.
