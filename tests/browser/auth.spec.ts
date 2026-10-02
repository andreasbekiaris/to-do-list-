import { test, expect, type BrowserContext } from "@playwright/test";
import { encode } from "next-auth/jwt";

async function setSession(context: BrowserContext, githubId: string) {
  const secret = process.env.TEST_AUTH_SECRET;
  if (!secret) throw new Error("The Playwright configuration must supply its ephemeral test secret.");
  const cookieName = "authjs.session-token";
  const token = await encode({
    token: { githubId, name: "Test Owner", sub: githubId },
    secret,
    salt: cookieName,
  });
  await context.addCookies([{ name: cookieName, value: token, url: "http://127.0.0.1:3100", httpOnly: true, sameSite: "Lax" }]);
}

test("anonymous users are redirected and the login fits the viewport", async ({ page, request }) => {
  const response = await request.get("/", { maxRedirects: 0 });
  expect(response.status()).toBe(307);
  expect(response.headers().location).toBe("/login");
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: /Make room for/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue with GitHub" })).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("an allowed signed session opens the protected page and can sign out", async ({ page, context }) => {
  await setSession(context, "42");
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Room for your next chapter." })).toBeVisible();
  await expect(page.getByText("Welcome back, Test.")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
});

test("a signed session for a different account is rejected", async ({ page, context }) => {
  await setSession(context, "43");
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Room for your next chapter." })).toHaveCount(0);
  const session = await page.request.get("/api/auth/session");
  expect(await session.json()).toBeNull();
});

test("the sign-in form starts GitHub OAuth with state and the correct callback", async ({ page }) => {
  // Intercept the external handoff. This test does not log in to real GitHub.
  await page.route("https://github.com/**", (route) => route.fulfill({ status: 200, body: "OAuth handoff intercepted by test" }));
  await page.goto("/login");
  await page.getByRole("button", { name: "Continue with GitHub" }).click();
  await page.waitForURL("https://github.com/login/oauth/authorize**");
  const url = new URL(page.url());
  expect(url.searchParams.get("client_id")).toBe("test-client-id");
  expect(url.searchParams.get("redirect_uri")).toBe("http://127.0.0.1:3100/api/auth/callback/github");
  expect(url.searchParams.get("state")).toBeTruthy();
  expect(url.searchParams.get("code_challenge")).toBeTruthy();
  expect(url.searchParams.get("code_challenge_method")).toBe("S256");
});

test("denied access has a clear message", async ({ page }) => {
  await page.goto("/login?error=AccessDenied");
  await expect(page.getByRole("alert").filter({ hasText: "That GitHub account" })).toContainText("That GitHub account doesn’t have access.");
});

test("incomplete configuration keeps the workspace and auth endpoints closed", async ({ page }) => {
  await page.goto("http://127.0.0.1:3101/");
  await expect(page).toHaveURL("http://127.0.0.1:3101/login");
  await expect(page.getByRole("button", { name: "Continue with GitHub" })).toBeDisabled();
  await expect(page.getByRole("alert").filter({ hasText: "Sign-in isn’t available yet." })).toBeVisible();
  const response = await page.request.get("http://127.0.0.1:3101/api/auth/session");
  expect(response.status()).toBe(503);
  expect(await response.json()).toEqual({ error: "Sign-in is temporarily unavailable." });
});
