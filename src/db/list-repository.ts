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
  return {
    async listForTask(taskId: string): Promise<ReferenceList[]> {
      const [listResult, itemResult] = await Promise.all([
        execute(sql`SELECT id, todo_id AS "taskId", title, sort_order AS "sortOrder"
          FROM task_lists WHERE todo_id=${taskId}::uuid ORDER BY sort_order, created_at, id`),
        execute(sql`SELECT i.id, i.list_id AS "listId", i.title, i.url, i.note, i.sort_order AS "sortOrder"
          FROM task_list_items i JOIN task_lists l ON l.id=i.list_id WHERE l.todo_id=${taskId}::uuid
          ORDER BY l.sort_order, l.created_at, l.id, i.sort_order, i.created_at, i.id`),
      ]);
      const items = itemResult.rows.map(row => itemSchema.parse(row));
      return listResult.rows.map(row => {
        const list = listSchema.parse(row);
        return { ...list, items: items.filter(item => item.listId === list.id) };
      });
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
  };
}
