import { test, expect, type Page } from "@playwright/test";
import { encode } from "next-auth/jwt";

const username = "my.owner";
const password = "test-only memorable password";
const setupKey = "test-only-private-setup-code";

async function fillRegistration(page: Page, name = username, code = setupKey) {
  await page.getByLabel("Username", { exact: true }).fill(name);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password", { exact: true }).fill(password);
  await page.getByLabel("Setup code", { exact: true }).fill(code);
}

async function register(page: Page) {
  await page.goto("/register");
  await fillRegistration(page);
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await expect(page).toHaveURL(/\/login\?created=1$/);
}

test.beforeEach(async ({ request }) => {
  const response = await request.post("http://127.0.0.1:3199/reset", { headers: { "X-Test-Database-Key": process.env.TEST_AUTH_SECRET! } });
  expect(response.ok()).toBe(true);
});

test("anonymous users can find Create account, with no GitHub login or viewport overflow", async ({ page, request }) => {
  const response = await request.get("/", { maxRedirects: 0 });
  expect(response.status()).toBe(307);
  expect(response.headers().location).toBe("/login");
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Create account" })).toBeVisible();
  await expect(page.getByText(/GitHub/)).toHaveCount(0);
  await page.getByRole("link", { name: "Create account" }).click();
  await expect(page.getByLabel("Setup code", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Show password", exact: true }).click();
  await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute("type", "text");
});

test("wrong setup codes are rejected, then a real account can be created", async ({ page }) => {
  await page.goto("/register");
  await fillRegistration(page, username, "incorrect-code");
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "setup code" })).toContainText("isn’t correct");
  await fillRegistration(page);
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await expect(page).toHaveURL(/\/login\?created=1$/);
  await expect(page.getByText("Account created. Log in to your space.")).toBeVisible();
});

test("username/password login rejects wrong passwords and supports logout", async ({ page }) => {
  await register(page);
  await page.getByLabel("Username", { exact: true }).fill(username);
  await page.getByLabel("Password", { exact: true }).fill("wrong password");
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "incorrect" })).toBeVisible();
  await page.getByLabel("Username", { exact: true }).fill(username.toUpperCase());
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Room for your next chapter." })).toBeVisible();
  await expect(page.getByText("Welcome back, my.owner.")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const session = await (await page.request.get("/api/auth/session")).json();
  expect(session.user.name).toBe(username);
  expect(JSON.stringify(session)).not.toContain("passwordHash");
  expect(JSON.stringify(session)).not.toContain(password);
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("link", { name: "Create account" })).toHaveCount(0);
});

test("registration closes after setup, even for an already-open registration form", async ({ page, context }) => {
  const stalePage = await context.newPage();
  await stalePage.goto("/register");
  await fillRegistration(stalePage, "another.owner");
  await register(page);
  await stalePage.getByRole("button", { name: "Create account", exact: true }).click();
  await expect(stalePage.getByRole("alert").filter({ hasText: "already exists" })).toBeVisible();
  await page.goto("/register");
  await expect(page).toHaveURL(/\/login\?registration=closed$/);
  await stalePage.close();
});

test("obsolete and foreign signed sessions cannot access the workspace", async ({ page, context }) => {
  await register(page);
  for (const token of [{ githubId: "42" }, { ownerId: "00000000-0000-4000-8000-000000000043" }]) {
    const cookieName = "authjs.session-token";
    const value = await encode({ token, secret: process.env.TEST_AUTH_SECRET!, salt: cookieName });
    await context.addCookies([{ name: cookieName, value, url: "http://127.0.0.1:3100", httpOnly: true, sameSite: "Lax" }]);
    await page.goto("/");
    await expect(page).toHaveURL(/\/login$/);
    expect(await (await page.request.get("/api/auth/session")).json()).toBeNull();
  }
});

test("missing configuration leaves login and registration disabled", async ({ page }) => {
  await page.goto("http://127.0.0.1:3101/");
  await expect(page).toHaveURL("http://127.0.0.1:3101/login");
  await expect(page.getByRole("button", { name: "Log in", exact: true })).toBeDisabled();
  await page.getByRole("link", { name: "Create account" }).click();
  await expect(page.getByRole("button", { name: "Create account", exact: true })).toBeDisabled();
  expect((await page.request.get("http://127.0.0.1:3101/api/auth/session")).status()).toBe(503);
});
