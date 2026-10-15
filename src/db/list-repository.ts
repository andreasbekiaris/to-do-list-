import { sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import type { ReferenceList, TaskListInput, TaskListItemInput } from "@/lib/list-validation";

type Execute = (query: SQL) => Promise<{ rows: Record<string, unknown>[] }>;

const listSchema = z.object({
  id: z.uuid(),
  taskId: z.uuid(),
  title: z.string(),
  sortOrder: z.coerce.number().int(),
});
const itemSchema = z.object({
  id: z.uuid(),
  listId: z.uuid(),
  title: z.string(),
  url: z.string(),
  note: z.string(),
  sortOrder: z.coerce.number().int(),
});

export function createListRepository(execute: Execute) {
  async function load(taskId: string | null): Promise<ReferenceList[]> {
    const lists = taskId === null ? sql`TRUE` : sql`todo_id=${taskId}::uuid`;
    const items = taskId === null ? sql`TRUE` : sql`l.todo_id=${taskId}::uuid`;
    const [listResult, itemResult] = await Promise.all([
      execute(sql`SELECT id, todo_id AS "taskId", title, sort_order AS "sortOrder"
        FROM task_lists WHERE ${lists} ORDER BY sort_order, created_at, id`),
      execute(sql`SELECT i.id, i.list_id AS "listId", i.title, i.url, i.note, i.sort_order AS "sortOrder"
        FROM task_list_items i JOIN task_lists l ON l.id=i.list_id WHERE ${items}
        ORDER BY l.sort_order, l.created_at, l.id, i.sort_order, i.created_at, i.id`),
    ]);
    const parsed = itemResult.rows.map(row => itemSchema.parse(row));
    return listResult.rows.map(row => {
      const list = listSchema.parse(row);
      return { ...list, items: parsed.filter(item => item.listId === list.id) };
    });
  }
  return {
    listForTask: (taskId: string) => load(taskId),
    /** Every task's lists (the assistant API). */
    all: () => load(null),
    async findList(id: string) {
      const result = await execute(sql`SELECT id, todo_id AS "taskId", title, sort_order AS "sortOrder" FROM task_lists WHERE id=${id}::uuid`);
      return result.rows[0] ? listSchema.parse(result.rows[0]) : null;
    },
    async findItem(id: string) {
      const result = await execute(sql`SELECT id, list_id AS "listId", title, url, note, sort_order AS "sortOrder" FROM task_list_items WHERE id=${id}::uuid`);
      return result.rows[0] ? itemSchema.parse(result.rows[0]) : null;
    },
    async createList(input: TaskListInput, taskId: string) {
      const result = await execute(sql`INSERT INTO task_lists (todo_id, title, sort_order)
        SELECT ${taskId}::uuid, ${input.title}, coalesce((SELECT max(sort_order)+1 FROM task_lists WHERE todo_id=${taskId}::uuid), 0)
        WHERE EXISTS (SELECT 1 FROM todos WHERE id=${taskId}::uuid) RETURNING id`);
      return result.rows[0]?.id as string | undefined;
    },
    async editList(id: string, input: TaskListInput) {
      const result = await execute(sql`UPDATE task_lists SET title=${input.title}, updated_at=now() WHERE id=${id}::uuid RETURNING id`);
      return result.rows.length > 0;
    },
    async removeList(id: string) {
      const result = await execute(sql`DELETE FROM task_lists WHERE id=${id}::uuid RETURNING id`);
      return result.rows.length > 0;
    },
    async createItem(input: TaskListItemInput, listId: string) {
      const result = await execute(sql`INSERT INTO task_list_items (list_id, title, url, note, sort_order)
        SELECT ${listId}::uuid, ${input.title}, ${input.url}, ${input.note}, coalesce((SELECT max(sort_order)+1 FROM task_list_items WHERE list_id=${listId}::uuid), 0)
        WHERE EXISTS (SELECT 1 FROM task_lists WHERE id=${listId}::uuid) RETURNING id`);
      return result.rows[0]?.id as string | undefined;
    },
    async editItem(id: string, input: TaskListItemInput) {
      const result = await execute(sql`UPDATE task_list_items SET title=${input.title}, url=${input.url}, note=${input.note}, updated_at=now()
        WHERE id=${id}::uuid RETURNING id`);
      return result.rows.length > 0;
    },
    async removeItem(id: string) {
      const result = await execute(sql`DELETE FROM task_list_items WHERE id=${id}::uuid RETURNING id`);
      return result.rows.length > 0;
    },
    async moveItem(id: string, direction: "up" | "down") {
      const offset = direction === "up" ? -1 : 1;
      const result = await execute(sql`WITH ordered AS (
        SELECT i.id, row_number() OVER (ORDER BY i.sort_order, i.created_at, i.id)::int-1 AS position
        FROM task_list_items i WHERE i.list_id=(SELECT list_id FROM task_list_items WHERE id=${id}::uuid)
      ), target AS (SELECT * FROM ordered WHERE id=${id}::uuid),
      neighbor AS (SELECT o.* FROM ordered o, target t WHERE o.position=t.position+${offset}),
      changed AS (UPDATE task_list_items i SET sort_order=CASE WHEN i.id=t.id THEN n.position ELSE t.position END, updated_at=now()
        FROM target t, neighbor n WHERE i.id=t.id OR i.id=n.id RETURNING i.id)
      SELECT EXISTS(SELECT 1 FROM changed) AS changed`);
      return z.object({ changed: z.boolean() }).parse(result.rows[0]).changed;
    },
    /** Puts a list on a task (its own or another) at a 0-based position; null = last. False if either is missing. */
    async placeList(id: string, taskId: string, position: number | null) {
      const result = await execute(sql`WITH moving AS (
        SELECT id FROM task_lists WHERE id=${id}::uuid AND EXISTS (SELECT 1 FROM todos WHERE id=${taskId}::uuid)
      ), siblings AS (
        SELECT l.id, row_number() OVER (ORDER BY l.sort_order, l.created_at, l.id)::int-1 AS position
        FROM task_lists l WHERE l.todo_id=${taskId}::uuid AND l.id<>${id}::uuid AND EXISTS (SELECT 1 FROM moving)
      ), slot AS (SELECT least(greatest(coalesce(${position}::int, 2147483647), 0), (SELECT count(*) FROM siblings))::int AS position),
      placed AS (
        SELECT s.id, CASE WHEN s.position>=slot.position THEN s.position+1 ELSE s.position END AS position FROM siblings s, slot
        UNION ALL SELECT m.id, slot.position FROM moving m, slot
      ), changed AS (UPDATE task_lists l SET todo_id=${taskId}::uuid, sort_order=p.position, updated_at=now()
        FROM placed p WHERE l.id=p.id RETURNING l.id)
      SELECT EXISTS(SELECT 1 FROM changed WHERE id=${id}::uuid) AS changed`);
      return z.object({ changed: z.boolean() }).parse(result.rows[0]).changed;
    },
    /** Puts an item in a list (its own or another) at a 0-based position; null = last. False if either is missing. */
    async placeItem(id: string, listId: string, position: number | null) {
      const result = await execute(sql`WITH moving AS (
        SELECT id FROM task_list_items WHERE id=${id}::uuid AND EXISTS (SELECT 1 FROM task_lists WHERE id=${listId}::uuid)
      ), siblings AS (
        SELECT i.id, row_number() OVER (ORDER BY i.sort_order, i.created_at, i.id)::int-1 AS position
        FROM task_list_items i WHERE i.list_id=${listId}::uuid AND i.id<>${id}::uuid AND EXISTS (SELECT 1 FROM moving)
      ), slot AS (SELECT least(greatest(coalesce(${position}::int, 2147483647), 0), (SELECT count(*) FROM siblings))::int AS position),
      placed AS (
        SELECT s.id, CASE WHEN s.position>=slot.position THEN s.position+1 ELSE s.position END AS position FROM siblings s, slot
        UNION ALL SELECT m.id, slot.position FROM moving m, slot
      ), changed AS (UPDATE task_list_items i SET list_id=${listId}::uuid, sort_order=p.position, updated_at=now()
        FROM placed p WHERE i.id=p.id RETURNING i.id)
      SELECT EXISTS(SELECT 1 FROM changed WHERE id=${id}::uuid) AS changed`);
      return z.object({ changed: z.boolean() }).parse(result.rows[0]).changed;
    },
  };
}
