// Loaded ONLY by Playwright's child server via NODE_OPTIONS. No production imports.
// Send the dummy Neon database's SQL to local PGlite; authentication is untouched.
const originalFetch = globalThis.fetch;
globalThis.fetch = function (input, init) {
  const url = new URL(typeof input === "string" || input instanceof URL ? input : input.url);
  if (url.href === "https://api.thread-test.invalid/sql") {
    const headers = new Headers(init?.headers);
    headers.set("X-Test-Database-Key", process.env.TEST_DATABASE_KEY);
    return originalFetch("http://127.0.0.1:3199/sql", { ...init, headers });
  }
  return originalFetch(input, init);
};
