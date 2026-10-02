import assert from "node:assert/strict";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { todos } from "../src/db/schema";

test("the migration supports a nested tree, constraints, timestamps, and cascade deletion", async (t) => {
  const client = new PGlite();
  const db = drizzle(client);
  t.after(() => client.close());
  await migrate(db, { migrationsFolder: "drizzle" });
  await migrate(db, { migrationsFolder: "drizzle" });

  const [parent] = await db.insert(todos).values({ title: "Phase 4" }).returning();
  const [child] = await db.insert(todos).values({ title: "Controllers", parentId: parent.id }).returning();
  const [leaf] = await db.insert(todos).values({ title: "GET vessels", parentId: child.id, dueAt: new Date("2026-10-05T12:30:00+03:00") }).returning();
  assert.equal(parent.parentId, null);
  assert.equal(parent.isDone, false);
  assert.equal(parent.completedAt, null);
  assert.equal(leaf.dueAt?.toISOString(), "2026-10-05T09:30:00.000Z");

  const ancestors = await client.query<{ title: string }>(
    `WITH RECURSIVE ancestors AS (
       SELECT id, parent_id, title, 0 AS depth FROM todos WHERE id = $1
       UNION ALL
       SELECT t.id, t.parent_id, t.title, a.depth + 1 FROM todos t JOIN ancestors a ON t.id = a.parent_id
     ) SELECT title FROM ancestors ORDER BY depth DESC`, [leaf.id],
  );
  assert.deepEqual(ancestors.rows.map((row) => row.title), ["Phase 4", "Controllers", "GET vessels"]);

  await assert.rejects(db.insert(todos).values({ title: " " }));
  await assert.rejects(db.insert(todos).values({ title: "Missing parent", parentId: "00000000-0000-4000-8000-000000000001" }));
  await assert.rejects(db.update(todos).set({ parentId: parent.id }).where(eq(todos.id, parent.id)));
  await assert.rejects(db.update(todos).set({ isDone: true }).where(eq(todos.id, leaf.id)));
  await assert.rejects(db.insert(todos).values({ title: "No date", allDay: true }));

  await db.update(todos).set({ isDone: true, completedAt: new Date() }).where(eq(todos.id, leaf.id));
  const [done] = await db.select().from(todos).where(eq(todos.id, leaf.id));
  assert.equal(done.isDone, true);
  assert.ok(done.completedAt);

  await db.delete(todos).where(eq(todos.id, parent.id));
  assert.equal((await db.select().from(todos)).length, 0);
});
