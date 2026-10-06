import { test, expect, type Page } from "@playwright/test";
const username = "task.owner";
const password = "test-only memorable password";
async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Username", { exact: true }).fill(username);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page.getByRole("heading", { name: "A little plan. A clearer day." })).toBeVisible();
}
async function add(page: Page, title: string, child = false, date?: string) {
  await page.getByRole("button", { name: child ? "Add subtask" : "New task", exact: true }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Title", { exact: true }).fill(title);
  if (date) await dialog.getByLabel("Due date").fill(date);
  await dialog.getByRole("button", { name: "Add task", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole("link", { name: title, exact: true })).toBeVisible();
}
test.beforeEach(async ({ page, request }) => {
  expect((await request.post("http://127.0.0.1:3199/reset", { headers: { "X-Test-Database-Key": process.env.TEST_AUTH_SECRET! } })).ok()).toBe(true);
  await page.goto("/register");
  await page.getByLabel("Username", { exact: true }).fill(username);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password", { exact: true }).fill(password);
  await page.getByLabel("Setup code", { exact: true }).fill("test-only-private-setup-code");
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await expect(page).toHaveURL(/\/login\?created=1$/);
  await login(page);
});
test("three-level tree persists across devices, edits notes and dates, completes and deletes a subtree", async ({ page, browser }, testInfo) => {
  await add(page, "Home project");
  await page.getByRole("link", { name: "Home project", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Home project", exact: true })).toBeVisible();
  const rootUrl = page.url();
  await add(page, "Kitchen", true);
  await page.getByRole("link", { name: "Kitchen", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Kitchen", exact: true })).toBeVisible();
  await add(page, "Fix the sink", true);
  await page.getByRole("link", { name: "Fix the sink", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Fix the sink", exact: true })).toBeVisible();
  const leafUrl = page.url();
  await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toContainText("Home project");
  await page.getByRole("button", { name: "Edit task", exact: true }).click();
  await page.getByLabel("Notes").fill("Call the plumber. Έλεγχος σωλήνων.");
  await page.getByLabel("Due date").fill("2027-03-28");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.reload();
  await expect(page.getByText("Call the plumber. Έλεγχος σωλήνων.", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const second = await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: "America/Los_Angeles", baseURL: "http://127.0.0.1:3100" });
  const phone = await second.newPage();
  await login(phone);
  await phone.goto(leafUrl);
  await expect(phone.getByText("Call the plumber. Έλεγχος σωλήνων.", { exact: true })).toBeVisible();
  await expect(phone.getByText(/Mar 28, 2027/)).toBeVisible();
  await second.close();
  await page.goto(rootUrl);
  await page.getByRole("checkbox", { name: "Complete Home project", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Also complete 2 sub-tasks?");
  await page.getByRole("button", { name: "Complete all", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.getByRole("checkbox", { name: "Complete Home project", exact: true })).toBeChecked();
  await expect(page.getByText("1 of 1 subtasks complete", { exact: true })).toBeVisible();
  await page.screenshot({ path: `/tmp/thread-tasks-${testInfo.project.name}.png`, fullPage: true });
  await page.getByRole("button", { name: "Delete task", exact: true }).click();
  await page.getByRole("button", { name: "Delete permanently", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Delete this task and its 2 sub-tasks?");
  await page.getByRole("button", { name: "Delete permanently", exact: true }).click();
  await expect(page).toHaveURL("http://127.0.0.1:3100/");
  await expect(page.getByRole("link", { name: "Home project", exact: true })).toHaveCount(0);
  expect((await page.goto(leafUrl))?.status()).toBe(404);
});
test("deadline filters, search, timed editing and optimistic failure rollback", async ({ page }, testInfo) => {
  await add(page, "Overdue errand", false, "2020-01-01");
  await add(page, "Future trip", false, "2099-01-01");
  await page.screenshot({ path: `/tmp/thread-dashboard-${testInfo.project.name}.png`, fullPage: true });
  await page.getByRole("button", { name: "Overdue", exact: true }).click();
  await expect(page.getByRole("link", { name: "Overdue errand", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Future trip", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Upcoming", exact: true }).click();
  await page.getByRole("link", { name: "Future trip", exact: true }).click();
  await page.getByRole("button", { name: "Edit task", exact: true }).click();
  await page.getByLabel("Time (optional)", { exact: true }).fill("15:30");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: "Edit task", exact: true }).click();
  await expect(page.getByLabel("Time (optional)", { exact: true })).toHaveValue("15:30");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.route("**/tasks/*", async route => { if (route.request().method() === "POST") await route.abort(); else await route.continue(); });
  await page.getByRole("checkbox", { name: "Complete Future trip", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Couldn't update" })).toBeVisible();
  await expect(page.getByRole("checkbox", { name: "Complete Future trip", exact: true })).not.toBeChecked();
  await page.unroute("**/tasks/*");
  await page.getByRole("checkbox", { name: "Complete Future trip", exact: true }).click();
  await expect(page.getByRole("checkbox", { name: "Complete Future trip", exact: true })).toBeChecked();
  await page.getByRole("link", { name: "All tasks", exact: true }).click();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await expect(page.getByRole("link", { name: "Future trip", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Overdue errand", exact: true })).toHaveCount(0);
  await page.getByLabel("Search tasks").fill("not a task");
  await expect(page.getByText("No tasks match your search. Try another word.")).toBeVisible();
});

test("anonymous action replay cannot create tasks or read a private task page", async ({ page, playwright }) => {
  const mutation = page.waitForRequest(request => request.method() === "POST" && !!request.headers()["next-action"]);
  await add(page, "Authorized task");
  const sent = await mutation;
  const anonymous = await playwright.request.newContext({ baseURL: "http://127.0.0.1:3100" });
  const response = await anonymous.post("/", {
    headers: { "next-action": sent.headers()["next-action"], "content-type": sent.headers()["content-type"], origin: "http://127.0.0.1:3100" },
    data: sent.postData()!.replace("Authorized task", "Unauthorized task"), maxRedirects: 0,
  });
  expect(response.headers()["x-action-redirect"]).toContain("/login");
  const url = await page.getByRole("link", { name: "Authorized task", exact: true }).getAttribute("href");
  const privatePage = await anonymous.get(url!, { maxRedirects: 0 });
  expect(privatePage.status()).toBe(307);
  expect(privatePage.headers().location).toBe("/login");
  await anonymous.dispose();
  await page.reload();
  await expect(page.getByRole("link", { name: "Authorized task", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Unauthorized task", exact: true })).toHaveCount(0);
});

test("installation help is accessible and returning to the app refreshes saved tasks", async ({ page, context }) => {
  await page.getByRole("button", { name: "Install Thread", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Thread on your desktop" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Windows · Chrome or Edge" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Mac · Safari" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Close dialog" }).click();
  const other = await context.newPage();
  await other.goto("/");
  await add(other, "Added on another device");
  await page.bringToFront();
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(page.getByRole("link", { name: "Added on another device", exact: true })).toBeVisible();
  await other.close();
});

test("task colors persist and themes can be changed on this device", async ({ page }) => {
  await page.getByRole("button", { name: "New task", exact: true }).first().click();
  const editor = page.getByRole("dialog", { name: "A new little plan" });
  await editor.getByLabel("Title", { exact: true }).fill("Colorful plan");
  await editor.getByText("Rose", { exact: true }).click();
  await editor.getByRole("button", { name: "Add task", exact: true }).click();
  const card = page.locator('article[data-task-color="rose"]');
  await expect(card.getByRole("link", { name: "Colorful plan", exact: true })).toBeVisible();
  await card.getByRole("button", { name: "Edit Colorful plan", exact: true }).click();
  await page.getByText("Sky", { exact: true }).click();
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.locator('article[data-task-color="sky"]')).toBeVisible();
  await page.getByRole("link", { name: "Colorful plan", exact: true }).click();
  await expect(page.locator('section[data-task-color="sky"]')).toBeVisible();

  await page.getByRole("button", { name: "Choose theme", exact: true }).click();
  await page.getByRole("button", { name: /Midnight/ }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "midnight");
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "midnight");
  await expect(page.locator('section[data-task-color="sky"]')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("day, week and month views organize dated tasks and keep undated tasks in All tasks", async ({ page }) => {
  await add(page, "Midweek appointment", false, "2027-05-12");
  await add(page, "Thursday deadline", false, "2027-05-13");
  await add(page, "Someday idea");

  await page.getByRole("button", { name: "Day", exact: true }).click();
  await page.getByLabel("Selected date").fill("2027-05-12");
  await expect(page.getByRole("link", { name: "Midweek appointment", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Thursday deadline", exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Someday idea", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Next day", exact: true }).click();
  await expect(page.getByRole("link", { name: "Thursday deadline", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "New task", exact: true }).first().click();
  await expect(page.getByRole("dialog").getByLabel("Due date")).toHaveValue("2027-05-13");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();

  await page.getByRole("button", { name: "Week", exact: true }).click();
  await expect(page.getByRole("link", { name: "Midweek appointment", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Thursday deadline", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Month", exact: true }).click();
  await expect(page.getByRole("link", { name: "Midweek appointment", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Thursday deadline", exact: true })).toBeVisible();
  await expect(page.getByText(/1 task has no deadline/)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  await page.getByRole("button", { name: "All tasks", exact: true }).click();
  await expect(page.getByRole("link", { name: "Someday idea", exact: true })).toBeVisible();
});

test("tasks can be dragged inside another task and moved back out", async ({ page }, testInfo) => {
  await add(page, "House project");
  await add(page, "Loose errand");
  const house = page.locator('article[data-task-id]').filter({ has: page.getByRole("link", { name: "House project", exact: true }) });
  const errand = page.locator('article[data-task-id]').filter({ has: page.getByRole("link", { name: "Loose errand", exact: true }) });
  await errand.dragTo(house);
  await expect(page.getByRole("link", { name: "Loose errand", exact: true })).toHaveCount(0);

  await page.getByRole("link", { name: "House project", exact: true }).click();
  await expect(page.getByRole("link", { name: "Loose errand", exact: true })).toBeVisible();
  await page.screenshot({ path: `/tmp/thread-task-moving-${testInfo.project.name}.png`, fullPage: true });
  await page.locator('article[data-task-id]').filter({ has: page.getByRole("link", { name: "Loose errand", exact: true }) }).dragTo(page.locator('[data-drop-zone="out"]'));
  await expect(page.getByRole("link", { name: "Loose errand", exact: true })).toHaveCount(0);

  await page.getByRole("link", { name: "All tasks", exact: true }).click();
  await page.getByRole("button", { name: "Move Loose errand", exact: true }).click();
  await page.getByLabel("New parent", { exact: true }).selectOption({ label: "House project" });
  await page.getByRole("button", { name: "Move task", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.getByRole("link", { name: "Loose errand", exact: true })).toHaveCount(0);
  await page.getByRole("link", { name: "House project", exact: true }).click();
  await expect(page.getByRole("link", { name: "Loose errand", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("long task titles wrap without overlapping move and edit controls", async ({ page }, testInfo) => {
  const title = "Prepare the extraordinarilylongunbrokentasktitlethatmustwrapinsideitsowncolumn before tomorrow morning";
  await add(page, title);
  const card = page.locator('article[data-task-id]').filter({ has: page.getByRole("link", { name: title, exact: true }) });
  const titleBox = await card.locator("[data-task-title]").boundingBox();
  const moveBox = await card.getByRole("button", { name: `Move ${title}`, exact: true }).boundingBox();
  const editBox = await card.getByRole("button", { name: `Edit ${title}`, exact: true }).boundingBox();
  expect(titleBox).not.toBeNull();
  expect(moveBox).not.toBeNull();
  expect(editBox).not.toBeNull();
  expect(titleBox!.x + titleBox!.width).toBeLessThanOrEqual(moveBox!.x);
  expect(moveBox!.x + moveBox!.width).toBeLessThanOrEqual(editBox!.x);
  expect(titleBox!.height).toBeGreaterThan(28);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `/tmp/thread-long-title-${testInfo.project.name}.png`, fullPage: true });
});
