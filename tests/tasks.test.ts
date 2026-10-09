import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { createTodoRepository } from "../src/db/todo-repository";
import { dueStatus, matchesFilter, sortTasks, todoInputSchema, type Task } from "../src/lib/todo-validation";
import { addDays, groupTasksByDate, monthKeys, moveMonth, startOfWeek, taskDateKey, weekKeys } from "../src/lib/calendar";
const client = new PGlite();
const db = drizzle(client);
const repository = createTodoRepository(query => db.execute(query));
const input = { title: "A task", description: "Notes", color: "sage" as const, priority: "none" as const, startAt: null, dueAt: null, allDay: false };
before(async () => { await migrate(db, { migrationsFolder: "drizzle" }); });
beforeEach(async () => { await client.exec("TRUNCATE todos CASCADE"); });
after(async () => { await client.close(); });
async function tree() {
  const root = (await repository.create({ ...input, title: "Root" }, null))!;
  const child = (await repository.create({ ...input, title: "Child" }, root))!;
  const leaf = (await repository.create({ ...input, title: "Leaf" }, child))!;
  return { root, child, leaf };
}
test("nested tasks persist notes/dates, resolve ordered breadcrumbs, and report direct progress", async () => {
  const { root, child, leaf } = await tree();
  assert.deepEqual((await repository.breadcrumbs(leaf)).map(item => item.title), ["Root", "Child", "Leaf"]);
  await repository.edit(leaf, { title: "Updated", description: "Ελληνικές σημειώσεις", color: "lavender", priority: "high", startAt: "2026-12-20T00:00:00.000Z", dueAt: "2026-12-24T00:00:00.000Z", allDay: true });
  assert.equal((await repository.detail(leaf))?.description, "Ελληνικές σημειώσεις");
  assert.equal((await repository.detail(leaf))?.color, "lavender");
  assert.equal((await repository.detail(leaf))?.priority, "high");
  assert.equal((await repository.detail(leaf))?.startAt, "2026-12-20T00:00:00.000Z");
  assert.equal((await repository.detail(leaf))?.dueAt, "2026-12-24T00:00:00.000Z");
  await repository.complete(child, true, "only", []);
  assert.equal((await repository.detail(root))?.childCount, 1);
  assert.equal((await repository.detail(root))?.completedChildren, 1);
  assert.equal((await repository.detail(leaf))?.isDone, false);
});
test("completion asks for all unfinished descendants and rejects stale confirmations atomically", async () => {
  const { root, child, leaf } = await tree();
  const asked = await repository.complete(root, true, "ask", []);
  assert.equal(asked.changed, false);
  assert.deepEqual(new Set(asked.ids), new Set([child, leaf]));
  const newChild = (await repository.create(input, root))!;
  const stale = await repository.complete(root, true, "tree", asked.ids);
  assert.equal(stale.changed, false);
  assert.equal((await repository.list()).some(task => task.isDone), false);
  assert.deepEqual(new Set(stale.ids), new Set([child, leaf, newChild]));
  assert.equal((await repository.complete(root, true, "tree", stale.ids)).changed, true);
  assert.equal((await repository.list()).every(task => task.isDone), true);
  await repository.complete(root, false, "ask", []);
  assert.equal((await repository.detail(root))?.isDone, false);
  const result = await client.query<{ completed_at: Date | null }>('SELECT completed_at FROM todos WHERE id=$1', [root]);
  assert.equal(result.rows[0].completed_at, null);
});
test("delete requires the complete descendant set, cascades, and preserves other roots", async () => {
  const { root, child, leaf } = await tree();
  const other = (await repository.create(input, null))!;
  const result = await repository.remove(root, []);
  assert.equal(result.changed, false);
  assert.deepEqual(new Set(result.ids), new Set([child, leaf]));
  assert.equal((await repository.remove(root, [child])).changed, false);
  assert.equal((await repository.remove(root, result.ids)).changed, true);
  assert.deepEqual((await repository.list()).map(task => task.id), [other]);
  assert.equal(await repository.create(input, root), undefined);
});
test("tasks can move under another task or back out without creating cycles", async () => {
  const { root, child, leaf } = await tree();
  const other = (await repository.create({ ...input, title: "Other" }, null))!;
  assert.equal(await repository.move(other, root), true);
  assert.equal((await repository.detail(other))?.parentId, root);
  assert.equal(await repository.move(other, null), true);
  assert.equal((await repository.detail(other))?.parentId, null);
  assert.equal(await repository.move(root, leaf), false);
  assert.equal(await repository.move(child, child), false);
  assert.equal((await repository.detail(root))?.parentId, null);
});
test("offline upserts accept client UUIDs, update tasks, reject cycles, and delete subtrees", async () => {
  const root = "00000000-0000-4000-8000-000000000001";
  const child = "00000000-0000-4000-8000-000000000002";
  assert.equal(await repository.put(root, { ...input, title: "Offline root" }, null), true);
  assert.equal(await repository.put(child, { ...input, title: "Offline child" }, root), true);
  assert.equal((await repository.detail(child))?.parentId, root);
  assert.equal(await repository.put(child, { ...input, title: "Edited offline", priority: "urgent" }, root), true);
  assert.equal((await repository.detail(child))?.title, "Edited offline");
  assert.equal((await repository.detail(child))?.priority, "urgent");
  assert.equal(await repository.put(root, { ...input, title: "Invalid move" }, child), false);
  assert.equal((await repository.detail(root))?.parentId, null);
  assert.equal(await repository.removeUnchecked(root), true);
  assert.equal(await repository.detail(child), null);
});
test("date-only deadlines stay on the calendar date; timed deadlines and done filters differ", () => {
  const now = new Date(2026, 9, 3, 12);
  const task: Task = { ...input, id: "unused", parentId: null, isDone: false, completedAt: null, childCount: 0, completedChildren: 0, parentTitle: null, allDay: true, dueAt: "2026-10-03T00:00:00.000Z" };
  assert.equal(dueStatus(task, now), "today");
  assert.equal(dueStatus({ ...task, dueAt: "2026-10-02T00:00:00.000Z" }, now), "overdue");
  assert.equal(dueStatus({ ...task, dueAt: "2026-10-04T00:00:00.000Z" }, now), "upcoming");
  assert.equal(dueStatus({ ...task, allDay: false, dueAt: new Date(now.getTime()-1000).toISOString() }, now), "overdue");
  assert.equal(matchesFilter({ ...task, allDay: false, dueAt: new Date(now.getTime()-1000).toISOString() }, "Today", now), true);
  const range = { ...task, startAt: "2026-10-01T00:00:00.000Z", dueAt: "2026-10-05T00:00:00.000Z" };
  assert.equal(matchesFilter(range, "Today", now), true);
  assert.equal(dueStatus(range, now), "upcoming");
  assert.equal(matchesFilter({ ...task, isDone: true }, "Overdue", now), false);
  assert.equal(matchesFilter({ ...task, isDone: true }, "Done", now), true);
  assert.equal(todoInputSchema.safeParse({ ...input, title: "   " }).success, false);
  assert.equal(todoInputSchema.safeParse({ ...input, allDay: true }).success, false);
  assert.equal(todoInputSchema.safeParse({ ...input, startAt: "2026-10-05T00:00:00.000Z" }).success, false);
  assert.equal(todoInputSchema.safeParse({ ...input, startAt: "2026-10-06T00:00:00.000Z", dueAt: "2026-10-05T00:00:00.000Z", allDay: true }).success, false);
});
test("calendar helpers group deadlines into Monday weeks and complete month grids", () => {
  const dated: Task = { ...input, id: "dated", parentId: null, isDone: false, completedAt: null, childCount: 0, completedChildren: 0, parentTitle: null, allDay: true, dueAt: "2027-05-12T00:00:00.000Z" };
  const undated: Task = { ...dated, id: "undated", dueAt: null };
  assert.equal(taskDateKey(dated), "2027-05-12");
  assert.equal(taskDateKey(undated), null);
  assert.equal(startOfWeek("2027-05-12"), "2027-05-10");
  assert.deepEqual(weekKeys("2027-05-12"), ["2027-05-10", "2027-05-11", "2027-05-12", "2027-05-13", "2027-05-14", "2027-05-15", "2027-05-16"]);
  assert.equal(addDays("2027-03-28", 1), "2027-03-29");
  assert.equal(moveMonth("2027-01-31", 1), "2027-02-01");
  assert.equal(monthKeys("2027-05-12").length, 42);
  const range = { ...dated, id: "range", startAt: "2027-05-10T00:00:00.000Z" };
  const keys = weekKeys("2027-05-12");
  const grouped = groupTasksByDate([dated, undated, range], keys);
  assert.deepEqual(grouped.get("2027-05-10")?.map(task => task.id), ["range"]);
  assert.deepEqual(grouped.get("2027-05-11")?.map(task => task.id), ["range"]);
  assert.deepEqual(grouped.get("2027-05-12")?.map(task => task.id), ["dated", "range"]);
});
test("tasks sort by closest date or highest priority while undated tasks come last", () => {
  const now = new Date("2027-05-12T12:00:00.000Z");
  const base: Task = { ...input, id: "base", parentId: null, isDone: false, completedAt: null, childCount: 0, completedChildren: 0, parentTitle: null };
  const tasks: Task[] = [
    { ...base, id: "undated-high", title: "Undated high", priority: "high" },
    { ...base, id: "far-urgent", title: "Far urgent", priority: "urgent", dueAt: "2027-06-12T00:00:00.000Z", allDay: true },
    { ...base, id: "near-low", title: "Near low", priority: "low", dueAt: "2027-05-13T00:00:00.000Z", allDay: true },
  ];
  assert.deepEqual(sortTasks(tasks, "date", now).map(task => task.id), ["near-low", "far-urgent", "undated-high"]);
  assert.deepEqual(sortTasks(tasks, "priority", now).map(task => task.id), ["far-urgent", "undated-high", "near-low"]);
  assert.deepEqual(sortTasks(tasks, "default", now), tasks);
});
