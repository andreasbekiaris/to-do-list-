# Phase 1: Vercel, Neon, and GitHub setup

The application builds without secrets and remains locked until authentication is configured. A build does not connect Neon or prove that OAuth works. These account setup steps happen in your own Vercel/GitHub accounts. Never paste secrets into chat or commit them.

## 1. Import the repository

1. Open [Vercel New Project](https://vercel.com/new).
2. Under **Import Git Repository**, connect GitHub if needed and click **Import** next to `andreasbekiaris/to-do-list-`. The repository must have the Phase 1 code on `main` first.
3. Keep **Framework Preset: Next.js** and **Root Directory: .**. Use **Node.js 24.x**. Under **Environment Variables**, add `ENABLE_EXPERIMENTAL_COREPACK=1` so Vercel honors the pinned pnpm version in `packageManager`. The repository specifies the install/build commands.
4. Click **Deploy**. Until credentials exist, the public sign-in page shows that sign-in is unavailable; the private page stays closed.
5. Copy the stable production domain from **Project → Settings → Domains**, such as `https://your-project.vercel.app` (use your actual domain).
6. Under **Project → Settings → Environments → Production**, confirm **Branch Tracking** is `main`. If the UI places Production Branch under **Settings → Git**, set it there. Pushes to `main` then trigger production deployments.

## 2. Connect Neon through the Vercel Marketplace

1. Open [Neon in the Vercel Marketplace](https://vercel.com/marketplace/neon) and click **Add Integration** (or **Install**).
2. Select the Vercel team/account containing the project. Create or select a Neon database and complete the Neon account connection if prompted.
3. Connect the database to this Vercel project. Enable **Production**; enable **Development** with a separate Neon development branch if you want an isolated local database.
4. In **Project → Settings → Environment Variables**, confirm the integration added `DATABASE_URL`. Leave its value managed by the integration. If a direct/unpooled URL is supplied, the migration command can use `DATABASE_URL_UNPOOLED`; otherwise it uses `DATABASE_URL`.

## 3. Create a GitHub OAuth app

1. Open GitHub **Settings → Developer settings → OAuth Apps → New OAuth App** ([direct link](https://github.com/settings/applications/new)). Choose **OAuth App**, not GitHub App.
2. Set **Application name** to `Thread`.
3. Set **Homepage URL** to the stable production domain from step 1.
4. Set **Authorization callback URL** to `https://YOUR-PRODUCTION-DOMAIN/api/auth/callback/github`.
5. Click **Register application**. Copy **Client ID**, then click **Generate a new client secret**. Enter those directly in Vercel in the next step.
6. Find your immutable numeric account ID at `https://api.github.com/users/YOUR-GITHUB-USERNAME`; use the JSON `id` field, not `node_id`, a username, or an OAuth client ID.

## 4. Add production environment variables

Open **Vercel → Project → Settings → Environment Variables → Add Environment Variable**. Scope the OAuth app credentials to **Production**.

| Name | Value |
| --- | --- |
| `AUTH_GITHUB_ID` | OAuth app Client ID |
| `AUTH_GITHUB_SECRET` | OAuth app Client secret |
| `ALLOWED_GITHUB_ID` | Your GitHub numeric `id` |
| `AUTH_SECRET` | A private, randomly generated secret of at least 32 characters |
| `AUTH_URL` | Your stable production origin, e.g. `https://your-project.vercel.app` |
| `DATABASE_URL` | Already injected by Neon; do not replace it with a placeholder |

Generate `AUTH_SECRET` privately in your own terminal with this cross-platform Node command, then copy the output directly into Vercel:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```

Do not set any of these as `NEXT_PUBLIC_` variables. The Anthropic key is not needed until Phase 3.

## 5. Apply the first migration

In a local checkout of this repository, install Node 24 and pnpm 11.19.0, then run:

```sh
pnpm install --frozen-lockfile
pnpm dlx vercel@latest login
pnpm dlx vercel@latest link
pnpm dlx vercel@latest env pull .env.local --environment=production
pnpm db:migrate
pnpm db:check
```

When `vercel link` asks, select the existing project you imported. If `.env.local` already exists, preserve it before pulling production values. The downloaded file is ignored by Git. These commands intentionally target the connected production database; `db:migrate` applies only unapplied checked-in migrations. `db:check` verifies both the connection and the `todos` table. Builds never run migrations automatically.

For local development afterward, pull Development variables into `.env.local` and use a **separate GitHub OAuth app** with homepage `http://localhost:3000` and callback `http://localhost:3000/api/auth/callback/github`. Set Development `AUTH_URL` to `http://localhost:3000`. A production OAuth app has a production callback and is not a substitute for a local app.

## 6. Redeploy and verify Phase 1

1. Open **Vercel → Project → Deployments**, open the latest production deployment's **⋯** menu, and choose **Redeploy** so the new environment variables are applied.
2. Open the stable production URL in a signed-out browser. It must show the sign-in page; direct `/` access must not reveal the workspace.
3. Click **Continue with GitHub**, authorize with the allowed account, and confirm the protected workspace opens and greets you. Click **Sign out** and confirm `/` is protected again.
4. Use a separate browser profile/private window signed into a **different GitHub account**. Complete GitHub authorization. It must return to the login page with “That GitHub account doesn’t have access.” Opening `/` afterward must still be denied.
5. Share the production URL and whether both account checks passed. Do not share credentials. Stop here for Phase 1 review.

## What the local checks prove

`pnpm test` tests the actual Auth.js allowlist callbacks and applies the real SQL migration to PGlite (Postgres compiled to WASM). `pnpm test:e2e` runs the production build on desktop/mobile Chromium with synthetic signed sessions and an intercepted OAuth handoff. These prove local request protection and form behavior, but do **not** verify your real GitHub OAuth app, live Neon credentials, Vercel deployment, or two real accounts. Those require the checks above.
