import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import type { createListRepository } from "@/db/list-repository";
import type { createTodoRepository } from "@/db/todo-repository";
import { taskListInputSchema, taskListItemInputSchema } from "@/lib/list-validation";
import { taskColors, taskPriorities, todoInputSchema, type Task } from "@/lib/todo-validation";

// The assistant API (Jarvis): one owner's tasks and their reference lists, behind a long random bearer token.
type Repository = ReturnType<typeof createTodoRepository>;
type ListRepository = ReturnType<typeof createListRepository>;
export type AgentResult = { status: number; body: Record<string, unknown> };

export function agentToken(env: Record<string, string | undefined> = process.env) {
  const token = env.JARVIS_API_TOKEN ?? "";
  return token.length >= 32 && token.length <= 512 ? token : null;
}

export function tokenMatches(header: string | null, token: string) {
  const presented = header?.startsWith("Bearer ") ? header.slice(7) : "";
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(presented), digest(token));
}

const id = z.uuid();
const position = z.number().int().min(0).nullable().optional(); // 0 = first; omitted/null = last
const optionalDue = { startAt: z.iso.datetime().nullable().optional(), dueAt: z.iso.datetime().nullable().optional(), allDay: z.boolean().optional(), color: z.enum(taskColors).optional(), priority: z.enum(taskPriorities).optional() };
const operation = z.discriminatedUnion("op", [
  z.object({ op: z.literal("add"), title: z.string(), description: z.string().optional(), parentId: id.nullable().optional(), ...optionalDue }),
  z.object({ op: z.literal("edit"), id, title: z.string().optional(), description: z.string().optional(), ...optionalDue }),
  z.object({ op: z.literal("complete"), id, done: z.boolean().default(true), includeSubtasks: z.boolean().default(false) }),
  z.object({ op: z.literal("delete"), id }),
  z.object({ op: z.literal("move"), id, parentId: id.nullable() }),
  z.object({ op: z.literal("merge"), id, intoId: id, title: z.string().optional(), description: z.string().optional() }),
  z.object({ op: z.literal("addList"), taskId: id, title: z.string(), items: z.array(z.object({ title: z.string(), url: z.string().optional(), note: z.string().optional() })).max(100).default([]) }),
  z.object({ op: z.literal("editList"), id, title: z.string() }),
  z.object({ op: z.literal("deleteList"), id }),
  z.object({ op: z.literal("moveList"), id, taskId: id.optional(), position }),
  z.object({ op: z.literal("addItem"), listId: id, title: z.string(), url: z.string().optional(), note: z.string().optional(), position }),
  z.object({ op: z.literal("editItem"), id, title: z.string().optional(), url: z.string().optional(), note: z.string().optional() }),
  z.object({ op: z.literal("deleteItem"), id }),
  z.object({ op: z.literal("moveItem"), id, listId: id.optional(), position }),
]);

const fail = (status: number, error: string): AgentResult => ({ status, body: { ok: false, error } });
const done = (body: Record<string, unknown> = {}): AgentResult => ({ status: 200, body: { ok: true, ...body } });

function validInput(base: Pick<Task, "title" | "description" | "color" | "priority" | "startAt" | "dueAt" | "allDay">) {
  const parsed = todoInputSchema.safeParse(base);
  return parsed.success ? { ok: true as const, data: parsed.data } : { ok: false as const, error: parsed.error.issues[0].message };
}

function validItem(base: { title: string; url?: string; note?: string }) {
  const parsed = taskListItemInputSchema.safeParse({ title: base.title, url: base.url ?? "", note: base.note ?? "" });
  return parsed.success ? { ok: true as const, data: parsed.data } : { ok: false as const, error: parsed.error.issues[0].message };
}

export async function listTasks(repository: Repository, lists: ListRepository): Promise<AgentResult> {
  const [tasks, all] = await Promise.all([repository.list(), lists.all()]);
  return done({ tasks, lists: all });
}

/** Applies one assistant operation. Pure apart from the repositories; unit-tested with PGlite. */
export async function runOperation(repository: Repository, lists: ListRepository, raw: unknown): Promise<AgentResult> {
  const parsed = operation.safeParse(raw);
  if (!parsed.success) return fail(400, parsed.error.issues[0].message);
  const request = parsed.data;
  switch (request.op) {
    case "addList": {
      const title = taskListInputSchema.safeParse({ title: request.title });
      if (!title.success) return fail(400, title.error.issues[0].message);
      const items = request.items.map(validItem);
      const bad = items.find(item => !item.ok);
      if (bad && !bad.ok) return fail(400, bad.error);
      const listId = await lists.createList(title.data, request.taskId);
      if (!listId) return fail(404, "No such task.");
      const itemIds: string[] = [];
      for (const item of items) if (item.ok) {
        const created = await lists.createItem(item.data, listId);
        if (created) itemIds.push(created);
      }
      return done({ id: listId, itemIds });
    }
    case "editList": {
      const title = taskListInputSchema.safeParse({ title: request.title });
      if (!title.success) return fail(400, title.error.issues[0].message);
      return (await lists.editList(request.id, title.data)) ? done({ id: request.id }) : fail(404, "No such list.");
    }
    case "deleteList": {
      const current = await lists.findList(request.id);
      if (!current) return fail(404, "No such list.");
      const items = (await lists.listForTask(current.taskId)).find(entry => entry.id === request.id)?.items.length ?? 0;
      return (await lists.removeList(request.id)) ? done({ deletedItems: items }) : fail(404, "No such list.");
    }
    case "moveList": {
      const current = await lists.findList(request.id);
      if (!current) return fail(404, "No such list.");
      return (await lists.placeList(request.id, request.taskId ?? current.taskId, request.position ?? null)) ? done() : fail(404, "No such task.");
    }
    case "addItem": {
      const item = validItem(request);
      if (!item.ok) return fail(400, item.error);
      const created = await lists.createItem(item.data, request.listId);
      if (!created) return fail(404, "No such list.");
      if (request.position != null) await lists.placeItem(created, request.listId, request.position);
      return done({ id: created });
    }
    case "editItem": {
      const current = await lists.findItem(request.id);
      if (!current) return fail(404, "No such list item.");
      const item = validItem({ title: request.title ?? current.title, url: request.url ?? current.url, note: request.note ?? current.note });
      if (!item.ok) return fail(400, item.error);
      return (await lists.editItem(request.id, item.data)) ? done({ id: request.id }) : fail(404, "No such list item.");
    }
    case "deleteItem":
      return (await lists.removeItem(request.id)) ? done() : fail(404, "No such list item.");
    case "moveItem": {
      const current = await lists.findItem(request.id);
      if (!current) return fail(404, "No such list item.");
      return (await lists.placeItem(request.id, request.listId ?? current.listId, request.position ?? null)) ? done() : fail(404, "No such list.");
    }
    case "add": {
      const input = validInput({ title: request.title, description: request.description ?? "", color: request.color ?? "sage", priority: request.priority ?? "none", startAt: request.startAt ?? null, dueAt: request.dueAt ?? null, allDay: request.allDay ?? false });
      if (!input.ok) return fail(400, input.error);
      const created = await repository.create(input.data, request.parentId ?? null);
      return created ? done({ id: created }) : fail(404, "The parent task doesn't exist.");
    }
    case "edit": {
      const current = await repository.detail(request.id);
      if (!current) return fail(404, "No such task.");
      const input = validInput({
        title: request.title ?? current.title, description: request.description ?? current.description, color: request.color ?? current.color, priority: request.priority ?? current.priority,
        startAt: request.startAt === undefined ? (request.dueAt === null ? null : current.startAt) : request.startAt,
        dueAt: request.dueAt === undefined ? current.dueAt : request.dueAt, allDay: request.allDay ?? (request.dueAt === null ? false : current.allDay),
      });
      if (!input.ok) return fail(400, input.error);
      return (await repository.edit(request.id, input.data)) ? done({ id: request.id }) : fail(404, "No such task.");
    }
    case "complete": {
      const scope = request.done && request.includeSubtasks ? "tree" : "only";
      let result = await repository.complete(request.id, request.done, scope, []);
      if (!result.found) return fail(404, "No such task.");
      if (!result.changed && scope === "tree") result = await repository.complete(request.id, true, "tree", result.ids);
      return result.changed ? done({ completedSubtasks: scope === "tree" ? result.ids.length : 0 }) : fail(409, "The task changed meanwhile; try again.");
    }
    case "delete": {
      let result = await repository.remove(request.id, []);
      if (!result.found) return fail(404, "No such task.");
      if (!result.changed) result = await repository.remove(request.id, result.ids);
      return result.changed ? done({ deletedSubtasks: result.ids.length }) : fail(409, "The task changed meanwhile; try again.");
    }
    case "move": {
      if (request.parentId === request.id) return fail(400, "A task can't contain itself.");
      return (await repository.move(request.id, request.parentId)) ? done() : fail(400, "Can't move it there (missing task, or into its own subtask).");
    }
    case "merge": {
      if (request.id === request.intoId) return fail(400, "Pick two different tasks.");
      const [source, target] = await Promise.all([repository.detail(request.id), repository.detail(request.intoId)]);
      if (!source || !target) return fail(404, "No such task.");
      const notes = [target.description, source.description ? `Merged from “${source.title}”:\n${source.description}` : `Merged from “${source.title}”.`]
        .filter(Boolean).join("\n\n");
      const input = validInput({
        title: request.title ?? target.title, description: request.description ?? notes, color: target.color, priority: target.priority,
        startAt: target.startAt ?? (target.dueAt ? null : source.startAt), dueAt: target.dueAt ?? source.dueAt, allDay: target.dueAt ? target.allDay : source.allDay,
      });
      if (!input.ok) return fail(400, input.error);
      const adopted = await repository.adoptChildren(source.id, target.id);
      if (!adopted.ok) return fail(400, "Can't merge a task into one of its own subtasks.");
      await repository.edit(target.id, input.data);
      const removed = await repository.remove(source.id, []);
      return removed.changed ? done({ id: target.id, movedSubtasks: adopted.moved }) : fail(409, "The task changed meanwhile; try again.");
    }
  }
}
