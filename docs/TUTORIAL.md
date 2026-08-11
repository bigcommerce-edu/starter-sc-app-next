# Lab Tutorial: BigCommerce Single-Click App Starter

> **Based on version 1.0.1** — this tutorial corresponds to the latest
> progressive history tagged `1.0.1`.

This document lists the lab exercises and their step-by-step diffs. Each
main-lab step links to a comparison between the step's `*-pre` (TODO
placeholders) and `*-post` (implemented) tags. Each enhancement links to a
single comparison between its one `*-pre` and `*-post` tag pair, since an
enhancement is tagged once for the whole feature rather than per internal
commit.

## Getting Started

The tutorial assumes you'll create your own Git repo rather than directly cloning this one. You'll need to start with the project's full boilerplate.

Use the `start` branch:

```shell
pnpm dlx create-next-app@latest -e https://github.com/bigcommerce-edu/starter-sc-app-next/tree/start
```

If this command doesn't work for you (your starter project should contain the directory `src/components/gift-certs-manager`), you can directly clone `start` and then branch from it:

```shell
git clone https://github.com/bigcommerce-edu/starter-sc-app-next.git -b start
```

Copy `.env.example` to `.env.local`:

```shell
cd <project-directory>
cp .env.example .env.local
```

Install dependencies and start the server:
```shell
pnpm install
pnpm run dev
```

## Lab 1: Adding BigDesign and basic Gift Certificates UI

[Completed state](https://github.com/bigcommerce-edu/starter-sc-app-next/tree/ui-complete)

This lab works with `DATA_MODE` set to `MOCK` in `.env.local`. No real API requests are made; mock data is included in the boilerplate.

* [Step 1: Wire BigDesign into the root layout](https://github.com/bigcommerce-edu/starter-sc-app-next/compare/ui-01-pre...ui-01-post?diff=split)
* [Step 2: Convert main layout components to BigDesign](https://github.com/bigcommerce-edu/starter-sc-app-next/compare/ui-02-pre...ui-02-post?diff=split)
* [Step 3: Build the gift certificates list page](https://github.com/bigcommerce-edu/starter-sc-app-next/compare/ui-03-pre...ui-03-post?diff=split)
* [Step 4: Replace the store home page with the gift certificates list](https://github.com/bigcommerce-edu/starter-sc-app-next/compare/ui-04-pre...ui-04-post?diff=split)
* [Step 5: Build the gift certificate detail page](https://github.com/bigcommerce-edu/starter-sc-app-next/compare/ui-05-pre...ui-05-post?diff=split)
* [Step 6: Status update and balance refill actions](https://github.com/bigcommerce-edu/starter-sc-app-next/compare/ui-06-pre...ui-06-post?diff=split)
* [Step 7: Convert remaining components to BigDesign](https://github.com/bigcommerce-edu/starter-sc-app-next/compare/ui-07-pre...ui-07-post?diff=split)

[Full diff](https://github.com/bigcommerce-edu/starter-sc-app-next/compare/ui-start...ui-complete?diff=split)

## Lab 2: Adding the BigCommerce REST API client

Fresh setup if needed:

```shell
pnpm dlx create-next-app@latest -e https://github.com/bigcommerce-edu/starter-sc-app-next/tree/rest-api-start
```

Starting with this lab, you'll need a real BigCommerce API token. Create a store-level API account in your store control panel (see details in Step 2 of the [README](../README.md)), and set the API token and store hash in `.env.local` in the lab steps where you see these added in `.env.example`.

[Completed state](https://github.com/bigcommerce-edu/starter-sc-app-next/tree/rest-api-complete)

* [Step 1: Introduce the real REST client](https://github.com/bigcommerce-edu/starter-sc-app-next/compare/rest-api-01-pre...rest-api-01-post?diff=split)
* [Step 2: Fetch gift certificates through the real REST client](https://github.com/bigcommerce-edu/starter-sc-app-next/compare/rest-api-02-pre...rest-api-02-post?diff=split)
* [Step 3: Fetch/update a single gift certificate through the real REST client](https://github.com/bigcommerce-edu/starter-sc-app-next/compare/rest-api-03-pre...rest-api-03-post?diff=split)

[Full diff](https://github.com/bigcommerce-edu/starter-sc-app-next/compare/rest-api-start...rest-api-complete?diff=split)

## Lab 3: The single-click app auth workflow and key storage/lookup

Fresh setup if needed:

```shell
pnpm dlx create-next-app@latest -e https://github.com/bigcommerce-edu/starter-sc-app-next/tree/auth-start
```

Starting with this lab, you'll need to switch `DATA_MODE` to "MULTITENANT" in `.env.local`, register an app in the BigCommerce Developer Portal, and set several other storage/app related env vars in `.env.local` in order to install/run your single-click app in your store control panel. (Each step will show clear var changes/additions in `.env.example`.)

See [Running Locally as a Single-Click App](./LOCAL-SINGLE-CLICK-APP.md) for the full setup: switching to `MULTITENANT` mode, exposing your dev server at a public HTTPS URL, and the minimal BigCommerce developer portal configuration.

At this stage, storage management is handled via a local SQLite database, so no external storage is required.

[Completed state](https://github.com/bigcommerce-edu/starter-sc-app-next/tree/auth-complete)

* [Step 1: Build the SQLite credentials store driver](https://github.com/bigcommerce-edu/starter-sc-app-next/compare/auth-01-pre...auth-01-post?diff=split)
* [Step 2: Implement the install callback](https://github.com/bigcommerce-edu/starter-sc-app-next/compare/auth-02-pre...auth-02-post?diff=split)
* [Step 3: Implement the launch callback](https://github.com/bigcommerce-edu/starter-sc-app-next/compare/auth-03-pre...auth-03-post?diff=split)

[Full diff](https://github.com/bigcommerce-edu/starter-sc-app-next/compare/auth-start...auth-complete?diff=split)

## Lab 4: Session tracking and authentication

Fresh setup if needed:

```shell
pnpm dlx create-next-app@latest -e https://github.com/bigcommerce-edu/starter-sc-app-next/tree/session-start
```

In this lab, you'll need to generate and set a secret in `.env.local` when indicated in the `.env.example` changes.

[Completed state](https://github.com/bigcommerce-edu/starter-sc-app-next/tree/session-complete)

* [Step 1: Implement session types and JWT signing](https://github.com/bigcommerce-edu/starter-sc-app-next/compare/session-01-pre...session-01-post?diff=split)
* [Step 2: Implement the session cookie](https://github.com/bigcommerce-edu/starter-sc-app-next/compare/session-02-pre...session-02-post?diff=split)
* [Step 3: Implement the secondary authorization check](https://github.com/bigcommerce-edu/starter-sc-app-next/compare/session-03-pre...session-03-post?diff=split)
* [Step 4: Implement the primary authorization gate](https://github.com/bigcommerce-edu/starter-sc-app-next/compare/session-04-pre...session-04-post?diff=split)

[Full diff](https://github.com/bigcommerce-edu/starter-sc-app-next/compare/session-start...session-complete?diff=split)

## Lab 5: The Postgres driver

Fresh setup if needed:

```shell
pnpm dlx create-next-app@latest -e https://github.com/bigcommerce-edu/starter-sc-app-next/tree/postgres-start
```

For this lab, you'll need to connect to a Postgres database from a local or deployed environment and set related `.env.local` vars as you see them demonstrated in `.env.example`. 

To deploy the finished app with a hosted Postgres database, see [Deploying to Vercel](./VERCEL-DEPLOYMENT.md).

[Completed state](https://github.com/bigcommerce-edu/starter-sc-app-next/tree/postgres-complete)

* [Step 1: Build the Postgres credentials store driver](https://github.com/bigcommerce-edu/starter-sc-app-next/compare/postgres-01-pre...postgres-01-post?diff=split)
* [Step 2: Build the Postgres driver loader indirection](https://github.com/bigcommerce-edu/starter-sc-app-next/compare/postgres-02-pre...postgres-02-post?diff=split)
* [Step 3: Write the initial Postgres migration and runner](https://github.com/bigcommerce-edu/starter-sc-app-next/compare/postgres-03-pre...postgres-03-post?diff=split)
* [Step 4: Add the POSTGRES driver-select branch](https://github.com/bigcommerce-edu/starter-sc-app-next/compare/postgres-04-pre...postgres-04-post?diff=split)

[Full diff](https://github.com/bigcommerce-edu/starter-sc-app-next/compare/postgres-start...postgres-complete?diff=split)

## Taking It Further

The state at the end of the previous tutorials still lacks a number of features from the complete app. See the enhancements below for details on how these features are added.

### Enhancement: Uninstall and remove-user callbacks

[Completed state](https://github.com/bigcommerce-edu/starter-sc-app-next/tree/uninstall-post)

[Full diff](https://github.com/bigcommerce-edu/starter-sc-app-next/compare/uninstall-pre...uninstall-post?diff=split)

### Enhancement: Caching and memoization

[Completed state](https://github.com/bigcommerce-edu/starter-sc-app-next/tree/caching-post)

[Full diff](https://github.com/bigcommerce-edu/starter-sc-app-next/compare/caching-pre...caching-post?diff=split)

### Enhancement: Rate-limit and timeout behavior

[Completed state](https://github.com/bigcommerce-edu/starter-sc-app-next/tree/rate-limit-post)

[Full diff](https://github.com/bigcommerce-edu/starter-sc-app-next/compare/rate-limit-pre...rate-limit-post?diff=split)

### Enhancement: Customers feature

[Completed state](https://github.com/bigcommerce-edu/starter-sc-app-next/tree/customers-post)

[Full diff](https://github.com/bigcommerce-edu/starter-sc-app-next/compare/customers-pre...customers-post?diff=split)

### Enhancement: Gift certificate list filtering, balance actions, and account decoration/transfer-to-store-credit

[Completed state](https://github.com/bigcommerce-edu/starter-sc-app-next/tree/gift-certs-enh-post)

[Full diff](https://github.com/bigcommerce-edu/starter-sc-app-next/compare/gift-certs-enh-pre...gift-certs-enh-post?diff=split)

### Enhancement: GraphQL client and App Extension registration

[Completed state](https://github.com/bigcommerce-edu/starter-sc-app-next/tree/graphql-ext-post)

[Full diff](https://github.com/bigcommerce-edu/starter-sc-app-next/compare/graphql-ext-pre...graphql-ext-post?diff=split)

### Enhancement: Cross-origin BigCommerce control panel links

[Completed state](https://github.com/bigcommerce-edu/starter-sc-app-next/tree/cp-links-post)

[Full diff](https://github.com/bigcommerce-edu/starter-sc-app-next/compare/cp-links-pre...cp-links-post?diff=split)

### Enhancement: Opt-in Vercel + Postgres deployment scaffolding

[Completed state](https://github.com/bigcommerce-edu/starter-sc-app-next/tree/scaffold-vercel-post)

[Full diff](https://github.com/bigcommerce-edu/starter-sc-app-next/compare/scaffold-vercel-pre...scaffold-vercel-post?diff=split)
