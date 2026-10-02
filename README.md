# Thread

A private, single-user nested to-do app for desktop and phone. One Next.js app, hosted on Vercel; installation as a PWA comes in Phase 4.

**Current scope: Phase 1 foundation.** GitHub login and the protected workspace are implemented. Real Vercel deployment, Neon migration, and owner/second-account login verification require the account setup in [the deployment guide](docs/DEPLOYMENT.md). Task editing, AI assistance, and PWA support are later phases.

## Stack

Next.js 16 App Router · strict TypeScript · Tailwind CSS 4 · shadcn-style New York/Radix primitives · Auth.js v5 (pinned `5.0.0-beta.32`) · Drizzle · Neon Postgres HTTP driver · pnpm 11.19.0 · Node 24.

## Start locally

```sh
pnpm install --frozen-lockfile
pnpm dlx vercel@latest login
pnpm dlx vercel@latest link
pnpm dlx vercel@latest env pull .env.local --environment=development
pnpm db:migrate
pnpm dev
```

First connect the Vercel project and integrations using [the setup guide](docs/DEPLOYMENT.md). Preserve an existing `.env.local` before pulling new values. For manual configuration, copy `.env.example` to `.env.local` and fill it privately. Local OAuth needs its own GitHub app with callback `http://localhost:3000/api/auth/callback/github` and `AUTH_URL=http://localhost:3000`.

Without authentication variables the app still builds, but redirects private requests to a sign-in page with a disabled button. There is no development auth bypass. The Phase 1 workspace does not query the database; use `pnpm db:check` to verify the real Neon connection and schema separately.

## Validation

```sh
pnpm lint
pnpm typecheck
pnpm tsc --noEmit
pnpm test
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
```

`pnpm test` covers allowlist callbacks and the actual SQL migration in PGlite. Browser tests run the built app on ports 3100/3101 with isolated synthetic credentials and cover desktop/mobile layouts, protected requests, sign-out, denied access, missing configuration, and the GitHub OAuth handoff. They do not use real GitHub accounts or Neon.

In this cloud workspace, use the existing Chromium with `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium pnpm test:e2e` instead of downloading a browser. Installation uses `pnpm install --frozen-lockfile --store-dir /workspace/.pnpm-store` because the home directory is read-only.

## Database changes

Edit `src/db/schema.ts`, then generate and inspect a new migration:

```sh
pnpm db:generate --name=describe_change
pnpm db:migrate
pnpm db:check
```

Commit migration SQL and metadata together. Migrations run explicitly, never inside Vercel builds or request handlers. The initial migration is `drizzle/0000_initial_todos.sql`.

## Project map

- `src/auth.ts`, `src/lib/auth-policy.ts`, `src/lib/require-user.ts`: GitHub authentication and server authorization.
- `src/app/login`: sign-in UI and authentication actions.
- `src/app/page.tsx`: protected workspace shell.
- `src/db`: Drizzle schema and lazy Neon connection.
- `src/components/ui`, `components.json`: editable shadcn-compatible UI primitives/configuration.
- `docs/PLAN.md`: product requirements, data model, and phase acceptance criteria.
- `docs/DEPLOYMENT.md`: Vercel/Neon/OAuth setup and live checks.
- `CLAUDE.md`: conventions and commands for future coding sessions.

No provider tokens or secrets are sent to client components. The immutable numeric GitHub ID is checked at sign-in, on session refresh, and at private request entry points. The only intentionally public application routes are sign-in and OAuth endpoints; assets and generic framework error pages contain no private data.
