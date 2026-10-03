import { sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import type { TodoInput, Task } from "@/lib/todo-validation";

type Execute = (query: SQL) => Promise<{ rows: Record<string, unknown>[] }>;
const taskSchema = z.object({
  id: z.uuid(), parentId: z.uuid().nullable(), title: z.string(), description: z.string(), color: z.enum(["sage", "sky", "lavender", "rose", "amber", "slate"]),
  isDone: z.boolean(), allDay: z.boolean(), dueAt: z.coerce.date().transform(d => d.toISOString()).nullable(),
  childCount: z.coerce.number(), completedChildren: z.coerce.number(), parentTitle: z.string().nullable(),
});
const columns = sql`t.id, t.parent_id AS "parentId", t.title, t.description, t.color, t.is_done AS "isDone", t.all_day AS "allDay", t.due_at AS "dueAt",
  (SELECT count(*)::int FROM todos c WHERE c.parent_id=t.id) AS "childCount",
  (SELECT count(*)::int FROM todos c WHERE c.parent_id=t.id AND c.is_done) AS "completedChildren",
  (SELECT title FROM todos p WHERE p.id=t.parent_id) AS "parentTitle"`;
const mutationSchema = z.object({ found: z.boolean(), changed: z.boolean(), ids: z.array(z.uuid()) });

export function createTodoRepository(execute: Execute) {
  return {
    async list(): Promise<Task[]> {
      const result = await execute(sql`SELECT ${columns} FROM todos t ORDER BY t.sort_order, t.created_at, t.id`);
      return result.rows.map(row => taskSchema.parse(row));
    },
    async detail(id: string) {
      const result = await execute(sql`SELECT ${columns} FROM todos t WHERE t.id=${id}::uuid`);
      return result.rows[0] ? taskSchema.parse(result.rows[0]) : null;
    },
    async breadcrumbs(id: string) {
      const result = await execute(sql`WITH RECURSIVE ancestors AS (
        SELECT id, parent_id, title, 0 AS depth FROM todos WHERE id=${id}::uuid
        UNION ALL SELECT t.id, t.parent_id, t.title, a.depth+1 FROM todos t JOIN ancestors a ON t.id=a.parent_id
      ) SELECT id, title FROM ancestors ORDER BY depth DESC`);
      return z.array(z.object({ id: z.uuid(), title: z.string() })).parse(result.rows);
    },
    async create(input: TodoInput, parentId: string | null) {
      const result = await execute(sql`INSERT INTO todos (title, description, color, due_at, all_day, parent_id)
        SELECT ${input.title}, ${input.description}, ${input.color}, ${input.dueAt}::timestamptz, ${input.allDay}, ${parentId}::uuid
        WHERE ${parentId}::uuid IS NULL OR EXISTS (SELECT 1 FROM todos WHERE id=${parentId}::uuid)
        RETURNING id`);
      return result.rows[0]?.id as string | undefined;
    },
    async edit(id: string, input: TodoInput) {
      const result = await execute(sql`UPDATE todos SET title=${input.title}, description=${input.description}, color=${input.color},
        due_at=${input.dueAt}::timestamptz, all_day=${input.allDay}, updated_at=now() WHERE id=${id}::uuid RETURNING id`);
      return result.rows.length > 0;
    },
    async complete(id: string, done: boolean, scope: "ask" | "only" | "tree", expectedIds: string[]) {
      // A single statement validates the current subtree and changes precisely the confirmed set.
      const result = await execute(sql`WITH RECURSIVE subtree AS (
        SELECT id, is_done FROM todos WHERE parent_id=${id}::uuid
        UNION ALL SELECT t.id, t.is_done FROM todos t JOIN subtree s ON t.parent_id=s.id
      ), pending AS (SELECT coalesce(jsonb_agg(id::text ORDER BY id) FILTER (WHERE NOT is_done), '[]'::jsonb) AS ids FROM subtree),
      changed AS (UPDATE todos SET is_done=${done}, completed_at=CASE WHEN ${done} THEN now() ELSE NULL END, updated_at=now()
        WHERE (id=${id}::uuid OR (${done} AND ${scope}='tree' AND id IN (SELECT id FROM subtree WHERE NOT is_done)))
        AND (NOT ${done} OR ${scope}='only' OR (SELECT ids='[]'::jsonb OR (${scope}='tree' AND ids=${JSON.stringify([...expectedIds].sort())}::jsonb) FROM pending)) RETURNING id)
      SELECT EXISTS(SELECT 1 FROM todos WHERE id=${id}::uuid) AS found, EXISTS(SELECT 1 FROM changed) AS changed, ids FROM pending`);
      return mutationSchema.parse(result.rows[0]);
    },
    async remove(id: string, expectedIds: string[]) {
      const result = await execute(sql`WITH RECURSIVE subtree AS (
        SELECT id FROM todos WHERE parent_id=${id}::uuid
        UNION ALL SELECT t.id FROM todos t JOIN subtree s ON t.parent_id=s.id
      ), children AS (SELECT coalesce(jsonb_agg(id::text ORDER BY id), '[]'::jsonb) AS ids FROM subtree),
      changed AS (DELETE FROM todos WHERE id=${id}::uuid AND (SELECT ids=${JSON.stringify([...expectedIds].sort())}::jsonb FROM children) RETURNING id)
      SELECT EXISTS(SELECT 1 FROM todos WHERE id=${id}::uuid) AS found, EXISTS(SELECT 1 FROM changed) AS changed, ids FROM children`);
      return mutationSchema.parse(result.rows[0]);
    },
  };
}
