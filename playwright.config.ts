import { randomBytes } from "node:crypto";
import { defineConfig, devices } from "@playwright/test";

// Ephemeral test-only credentials. No authentication bypass exists in the app.
const secret = process.env.TEST_AUTH_SECRET ?? randomBytes(32).toString("base64");
process.env.TEST_AUTH_SECRET = secret;

const authEnvironment = {
  AUTH_SECRET: secret,
  DATABASE_URL: "postgresql://test:test@ep-local.thread-test.invalid/test",
  ACCOUNT_SETUP_KEY: "test-only-private-setup-code",
  TEST_DATABASE_KEY: secret,
  NODE_OPTIONS: "--import=./tests/helpers/neon-test-fetch.mjs",
  AUTH_TRUST_HOST: "true",
};

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3100",
    screenshot: "only-on-failure",
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
    },
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: [
    {
      command: "pnpm exec tsx tests/helpers/neon-test-server.ts",
      url: "http://127.0.0.1:3199/health",
      reuseExistingServer: false,
      env: { TEST_DATABASE_KEY: secret },
    },
    {
      command: "pnpm start --hostname 127.0.0.1 --port 3100",
      url: "http://127.0.0.1:3100/login",
      reuseExistingServer: false,
      env: { ...authEnvironment, AUTH_URL: "http://127.0.0.1:3100" },
    },
    {
      command: "pnpm start --hostname 127.0.0.1 --port 3101",
      url: "http://127.0.0.1:3101/login",
      reuseExistingServer: false,
      env: { ...authEnvironment, AUTH_URL: "http://127.0.0.1:3101", DATABASE_URL: "" },
    },
  ],
});
