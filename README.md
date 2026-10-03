# Thread

A private, single-user nested to-do app for desktop and phone. One Next.js app hosted on Vercel, installable in its own window on supported desktop and mobile browsers.

Username/password accounts, nested tasks, and desktop installation are implemented. At the user's request, installation was brought forward ahead of AI writing, which remains deferred.

## Colors and themes

Every task can use one of six saved colors: Sage, Sky, Lavender, Rose, Amber, or Slate. Choose the color while creating a task, use the small pencil on any task card for quick editing, or use **Edit task** on its full page. Task colors are stored in Neon and therefore follow the task across desktop and mobile devices.

Use **Theme** in the signed-in header to choose Sage, Lavender, Sunset, or Midnight for the whole interface. The theme is remembered locally on that browser/device, so each device can have its own look. Changing the app theme does not change individual task colors.

## Install on your desktop

Open https://to-do-list-ten-pi-88.vercel.app in your regular browser and sign in. Use **Install app** in Thread's header for the native installation prompt when available, or follow these browser steps:

- **Windows, Chrome:** use the install icon at the right of the address bar, or the menu's install option (often under Cast, save, and share). Confirm installation, then pin Thread to the taskbar or Start menu.
- **Windows, Edge:** open the browser menu → Apps → Install this site as an app. Confirm and choose the available pin/shortcut options.
- **Mac, Safari (macOS Sonoma or later):** File → Add to Dock → Add. Launch Thread from your Dock.
- **Mac, Chrome:** use the address-bar install icon or the browser's install menu. You can keep the app in your Dock.
- **iPhone/iPad:** Safari → Share → Add to Home Screen.
- **Android:** Chrome menu → Install app / Add to Home screen.

Installation must be confirmed on your device. Browser menu wording can vary; the in-app browser inside Codex is not the place to install it. Use the same username/password everywhere; Safari's installed app may ask you to sign in again. Thread uses the same Neon database across devices and refreshes when you return to the window or regain connectivity. An open editor is left undisturbed.

Internet access is required to load and save tasks. There is no service-worker cache, offline editing, or background sync of private task data. Modern Chromium installation uses the manifest directly; Safari provides Add to Dock. Updates arrive from the website without downloading a separate executable.

## Use your task dashboard

- Choose **New task** to add a title, optional notes, and a deadline. Leave time blank for a calendar-only due date; timed deadlines use your device’s timezone.
- Open a task to edit it or **Add subtask**. Subtasks can contain further subtasks; breadcrumbs take you back through the tree.
- **All** shows root tasks. Today, Upcoming, Overdue, Done, and search can surface tasks from any depth. Today includes deadlines earlier today; those also appear under Overdue until complete.
- Check a task to complete it. For unfinished descendants, choose **Complete all** or **Only this task**. Reopening a task affects only that task. Card progress counts direct children.
- Deleting a task with descendants requires confirmation of their total and removes the whole subtree. Changes persist in Neon and are available on your other devices when you return to the app, navigate, or refresh.

This phase uses the existing `todos` table and requires no additional migration. Server actions and task pages require the owner’s authenticated session. Completion and deletion validate the current descendant set in one SQL statement, so a stale confirmation cannot silently include new subtasks.

## Create your account

Follow [the Vercel setup guide](docs/DEPLOYMENT.md) to connect Neon, set `AUTH_SECRET` and `ACCOUNT_SETUP_KEY`, and apply the migrations. Open `/register`, choose your username/password, and enter the private setup code. Once your account exists, registration closes. Login then needs only your username and password on each device.

The setup code prevents a stranger from claiming the empty workspace first. It is not your login password, is never rendered into a page, and can be removed from Vercel after account creation. Passwords are stored as salted scrypt hashes. JWT sessions are checked against the current owner account. Old GitHub sessions are rejected.

## Stack

Next.js 16 App Router · strict TypeScript · Tailwind CSS 4 · shadcn-style New York/Radix primitives · Auth.js v5 Credentials (`5.0.0-beta.32`) · Drizzle · Neon Postgres HTTP driver · pnpm 11.19.0 · Node 24.

## Local development

```sh
pnpm install --frozen-lockfile
pnpm dlx vercel@latest login
pnpm dlx vercel@latest link
pnpm dlx vercel@latest env pull .env.local --environment=development
pnpm db:migrate
pnpm dev
```

Select your existing Vercel project. Preserve an existing `.env.local` before pulling values. Alternatively, copy `.env.example` to `.env.local` and fill it privately. Use `AUTH_URL=http://localhost:3000` locally and a development Neon branch to keep local data separate. No GitHub OAuth app is needed.

Without auth/database configuration, the app builds but private routes redirect to disabled login/registration forms. There is no development auth bypass. `pnpm db:check` verifies the live connection and required tables without printing credentials.

## Checks

```sh
pnpm lint
pnpm typecheck
pnpm tsc --noEmit
pnpm test
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
```

Unit/integration tests cover password verification, setup-code validation, simultaneous registration, persistent rate limits, session authorization, SQL migrations, nested task persistence, stale mutation confirmations, cascade deletion, and deadline filtering. Desktop/mobile browser tests cover authentication and task creation/editing, three-level nesting, persistence in a second device context, dates across timezones, completion rollback, deletion, and anonymous action rejection. Test-only infrastructure runs PGlite behind a dummy Neon HTTP endpoint; application authentication has no test bypass. Keep these checks separate from live Neon/Vercel verification.

In the cloud workspace use `pnpm install --frozen-lockfile --store-dir /workspace/.pnpm-store`, and run browser tests with `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium pnpm test:e2e`. Ports 3100, 3101, and 3199 must be available.

## Database changes

Edit `src/db/schema.ts`, then run `pnpm db:generate --name=describe_change`. Review and commit the new SQL and metadata. Apply explicitly with `pnpm db:migrate`, then verify with `pnpm db:check`. Never mutate the database during builds or requests, and do not change previously applied migrations.

The owner and authentication-limit tables are in `0001_owner_password_auth.sql`. `0002_task_colors.sql` adds the validated task color column and defaults existing tasks to Sage. Existing to-dos are preserved. Auth limits are global to this single-owner app: 10 login attempts or 5 setup-code attempts per 15 minutes. Successful login clears the login counter. Email-based password recovery is not part of Phase 1.

See [the product plan](docs/PLAN.md), [deployment steps](docs/DEPLOYMENT.md), and [agent conventions](CLAUDE.md). Stop after each phase for review.
