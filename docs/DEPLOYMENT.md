# Username/password setup on Vercel

The app no longer uses GitHub login. It still needs Neon to store your account and tasks. No account/password is hardcoded or sent to the browser.

## 1. Connect the database

In [Vercel](https://vercel.com/dashboard), open the **to-do-list** project.

- If Neon is already connected, keep it.
- Otherwise open [Neon in the Vercel Marketplace](https://vercel.com/marketplace/neon) → **Add Integration / Install**, create or select a Neon database, and connect it to this project for **Production**.
- Confirm **Project → Settings → Environment Variables** contains the injected `DATABASE_URL`.

Keep Node.js **24.x**, production branch **main**, and `ENABLE_EXPERIMENTAL_COREPACK=1` so Vercel uses the pinned pnpm version. Future pushes to `main` deploy automatically.

## 2. Set the account configuration

Open **Project → Settings → Environment Variables** and add these for **Production**:

| Name | Value |
| --- | --- |
| `AUTH_SECRET` | Keep an existing valid secret, or generate a private random value of at least 32 characters |
| `ACCOUNT_SETUP_KEY` | A separate private setup code, 16–256 characters; used only to create your account |
| `AUTH_URL` | `https://to-do-list-ten-pi-88.vercel.app` |
| `DATABASE_URL` | Supplied by the Neon integration |

Generate a secret privately in your own terminal with:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```

Run it separately for `AUTH_SECRET` and `ACCOUNT_SETUP_KEY`. Copy each output directly into Vercel, never into chat or Git. Do not use `NEXT_PUBLIC_` names. The old `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`, and `ALLOWED_GITHUB_ID` variables are no longer used.

## 3. Apply the account migration

From a local checkout containing the latest `main` code:

```sh
pnpm install --frozen-lockfile
pnpm dlx vercel@latest login
pnpm dlx vercel@latest link
pnpm dlx vercel@latest env pull .env.local --environment=production
pnpm db:migrate
pnpm db:check
```

Select the existing **to-do-list** project when linking. Preserve an existing `.env.local` first; the downloaded file is ignored by Git. These commands target production deliberately. The new migration creates the account and attempt-limit tables without deleting existing to-dos. Running migrations again is safe; Drizzle tracks which ones are applied. The final command checks all required tables without printing secrets.

For later local development, use Development variables and a separate Neon development branch; set local `AUTH_URL=http://localhost:3000`.

## 4. Redeploy and create your account

1. Open **Vercel → Project → Deployments → latest deployment → ⋯ → Redeploy** so the new variables take effect.
2. Open `https://to-do-list-ten-pi-88.vercel.app/register`.
3. Choose a username (3–32 characters) and password (at least 12 characters), confirm the password, and enter the **ACCOUNT_SETUP_KEY** value as the setup code.
4. Click **Create account**. Then log in with your new username/password.
5. After creating the account, you may remove `ACCOUNT_SETUP_KEY` from Vercel and redeploy. It is not needed for login, and keeping it does not permit a second account.

## 5. Verify Phase 1

- Correct username/password opens the private workspace; **Sign out** returns to login.
- A signed-out visit to `/` redirects to `/login`.
- An incorrect password is rejected without revealing whether the username exists.
- A new visit to `/register` redirects to login because the one owner account exists.
- Log in with the same credentials on your phone to confirm access from another device.
- `pnpm db:check` must succeed against the real Neon database.

Local tests cover these flows with a local test database. Live deployment and Neon checks remain separate. Do not begin Phase 2 until this phase is reviewed.
