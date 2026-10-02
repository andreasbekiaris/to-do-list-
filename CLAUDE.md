@AGENTS.md

# Thread: personal nested to-dos

Read `docs/PLAN.md` for the user's complete phase boundaries. Work on only the current phase and STOP after each phase for review. Do not start Phase 2 without the user's go-ahead. Phase 1 requires real deployed login verification before it is complete; local tests do not prove that.

## Conventions

- pnpm 11.19.0, Node 24, Next.js App Router, strict TypeScript, Tailwind v4, shadcn-compatible New York/Radix primitives in `src/components/ui`.
- Cloud tasks already have an isolated checkout. Use this checkout; do not create a worktree unless explicitly requested.
- Server Components by default. Add `use client` only for interaction. Await `params` and `searchParams` in Next.js 16.
- `src/auth.ts` configures Auth.js v5 (pinned beta). The GitHub numeric ID is the identity; never authorize by name/email or client input.
- Call `requireUser()` inside EVERY private page, data access function, and server action. Layout-only checks are insufficient. Private pages must render at request time (`dynamic = "force-dynamic"`).
- `/login`, sign-in initiation, and `/api/auth/*` are public authentication entry points. Sign-out and all future mutations require `requireUser()`.
- No auth bypasses, demo sessions, test login routes, or public registration. Browser tests sign test sessions using an ephemeral key in isolated local servers.
- Keep database access, auth secrets, and AI behind `server-only`. Never use `NEXT_PUBLIC_` for credentials or return provider access tokens to the client.
- `DATABASE_URL` comes from Vercel's Neon integration. `DATABASE_URL_UNPOOLED` is optional for CLI migrations. Do not run migrations during builds or page requests.
- Change `src/db/schema.ts`, generate and review a new Drizzle migration, and commit the SQL and metadata. Never edit an already applied migration or use `db:push` in production.
- Todo title: nonblank, max 500 chars. Update `isDone` and `completedAt` together. `updatedAt` is set by Drizzle's `$onUpdate`; raw SQL mutations must update it explicitly.
- A todo may have arbitrarily nested children. The FK cascades deletion. Direct self-parenting is blocked by a check; future reparenting must also reject longer cycles. No reparenting UI is currently implemented.
- Date-only semantics for Phase 2: store the chosen calendar date at UTC midnight with `allDay=true`, display its UTC calendar components without zone shifting. Timed deadlines are instants displayed in the device's local zone.
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

`pnpm typecheck` generates Next.js route types before running TypeScript. The user's required `pnpm lint` and `pnpm tsc --noEmit` must pass at every phase. Build before `test:e2e`; it starts its own production servers on ports 3100 and 3101. Install a browser with `pnpm exec playwright install chromium`, or set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium` in this cloud workspace. PGlite tests need no external database.

In the cloud sandbox, use `pnpm install --frozen-lockfile --store-dir /workspace/.pnpm-store` because the home directory is read-only. Do not commit machine-specific paths into package configuration. See `docs/DEPLOYMENT.md` for account setup and real production verification.
