import { test, expect, chromium } from "@playwright/test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("desktop installation manifest and icons are served with valid metadata", async ({ page, request }) => {
  await page.goto("/login");
  const href = await page.locator('link[rel="manifest"]').getAttribute("href");
  expect(href).toBeTruthy();
  const response = await request.get(href!);
  expect(response.ok()).toBe(true);
  const manifest = await response.json();
  expect(manifest).toMatchObject({ id: "/", start_url: "/", scope: "/", display: "standalone", short_name: "Thread" });
  for (const icon of manifest.icons) {
    const image = await request.get(icon.src);
    expect(image.ok()).toBe(true);
    expect(image.headers()["content-type"]).toContain("image/png");
    const png = await image.body();
    expect(png.readUInt32BE(16)).toBe(Number(icon.sizes.split("x")[0]));
    expect(png.readUInt32BE(20)).toBe(Number(icon.sizes.split("x")[1]));
  }
  // Playwright's default contexts are incognito, which intentionally cannot install apps.
  // Use an isolated regular profile to check actual Chromium installability.
  const profile = await mkdtemp(join(tmpdir(), "thread-install-"));
  const browser = await chromium.launchPersistentContext(profile, { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined, headless: true });
  try {
    const installPage = await browser.newPage();
    await installPage.goto("http://127.0.0.1:3100/login");
    const session = await browser.newCDPSession(installPage);
    const appManifest = await session.send("Page.getAppManifest");
    expect(appManifest.errors).toEqual([]);
    const installability = await session.send("Page.getInstallabilityErrors");
    expect(installability.installabilityErrors).toEqual([]);
  } finally {
    await browser.close();
    await rm(profile, { recursive: true, force: true });
  }
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute("href", "/icons/thread-180.png");
});
