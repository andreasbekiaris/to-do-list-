@AGENTS.md

# Thread: personal nested to-dos

Read `docs/PLAN.md` for the user's complete phase boundaries. The user confirmed production login and has since authorized desktop installation, task colors/device-local themes, and calendar organization (All tasks / Day / Week / Month). These additions are authorized ahead of Phase 3; AI remains deferred. Stop after the requested calendar work. Keep local test results separate from production checks.

## Conventions

- pnpm 11.19.0, Node 24, Next.js App Router, strict TypeScript, Tailwind v4, shadcn-compatible New York/Radix primitives in `src/components/ui`.
- Cloud tasks already have an isolated checkout. Use this checkout; do not create a worktree unless explicitly requested.
- Server Components by default. Add `use client` only for interaction. Await `params` and `searchParams` in Next.js 16.
- `src/auth.ts` configures Auth.js v5 Credentials (pinned beta). Username/password login replaces GitHub OAuth at the user's request. The owner account UUID is the session identity; revalidate it against the database on every session read.
- Call `requireUser()` inside EVERY private page, data access function, and server action. Layout-only checks are insufficient. Private pages must render at request time (`dynamic = "force-dynamic"`).
- `/login`, `/register`, login/account-creation actions, and `/api/auth/*` are public authentication entry points. Sign-out and all future task mutations require `requireUser()`.
- Registration requires the private `ACCOUNT_SETUP_KEY` and closes after the owner account exists. The database's unique/check constraints enforce one owner even under concurrent registration. This remains a single-user app.
- Passwords use salted scrypt (N=32768, r=8, p=1), never plaintext. Normalize usernames to lowercase. Validate all inputs on the server; generic login errors must not disclose whether a username exists.
- Postgres rate-limit buckets protect login (10 attempts / 15 minutes) and registration (5 / 15 minutes) across Vercel instances. These are global limits for the single-owner app. Successful login clears its bucket.
- No auth bypasses, demo sessions, or test login routes. Browser tests perform real registration/password login against SQL migrations in local PGlite. The test-only Node fetch hook maps a dummy Neon endpoint to PGlite and must never be imported into application code or configured on Vercel.
- Keep database access, auth secrets, and AI behind `server-only`. Never use `NEXT_PUBLIC_` for credentials or return provider access tokens to the client.
- `DATABASE_URL` comes from Vercel's Neon integration. `DATABASE_URL_UNPOOLED` is optional for CLI migrations. Do not run migrations during builds or page requests.
- Change `src/db/schema.ts`, generate and review a new Drizzle migration, and commit the SQL and metadata. Never edit an already applied migration or use `db:push` in production.
- Todo title: nonblank, max 500 chars. Update `isDone` and `completedAt` together. `updatedAt` is set by Drizzle's `$onUpdate`; raw SQL mutations must update it explicitly.
- Task color is one of `sage`, `sky`, `lavender`, `rose`, `amber`, or `slate` and persists in Postgres. The app theme is intentionally device-local in `localStorage` and must not contain private task data.
- A todo may have arbitrarily nested children. The FK cascades deletion. Direct self-parenting is blocked by a check; future reparenting must also reject longer cycles. No reparenting UI is currently implemented.
- Date-only semantics for Phase 2: store the chosen calendar date at UTC midnight with `allDay=true`, display its UTC calendar components without zone shifting. Timed deadlines are instants displayed in the device's local zone.
- Calendar weeks begin Monday. Calendar views include dated tasks at every nesting level; undated tasks remain available in All tasks. Timed tasks are grouped by the device's local calendar day, while all-day tasks use their stored UTC date components.
- No native apps, sharing, push notifications, offline writes, websockets, or realtime services.
- Anthropic is Phase 3 only: Vercel AI SDK, `claude-haiku-4-5-20251001`, Zod output, max 500 input chars, explicit preview/accept, preserve Greek/English. `ANTHROPIC_API_KEY` belongs only in Vercel environment settings.

## Commands

```sh
pnpm install --frozen-lockfile
pnpm dev
pnpm lint
pnpm tsc --noEmit
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
pnpm db:generate --name=describe_change
pnpm db:migrate
pnpm db:check
```

`pnpm typecheck` generates Next.js route types before running TypeScript. The user's required `pnpm lint` and `pnpm tsc --noEmit` must pass at every phase. Build before `test:e2e`; it starts its own production servers on ports 3100/3101 and a test-only PGlite SQL server on 3199. Browser tests run serially because they reset the shared test database between cases. Install a browser with `pnpm exec playwright install chromium`, or set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium` in this cloud workspace. Tests need no external database.

In the cloud sandbox, use `pnpm install --frozen-lockfile --store-dir /workspace/.pnpm-store` because the home directory is read-only. Do not commit machine-specific paths into package configuration. See `docs/DEPLOYMENT.md` for account setup and real production verification.
