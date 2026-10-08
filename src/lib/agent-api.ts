import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import type { createTodoRepository } from "@/db/todo-repository";
import { taskColors, taskPriorities, todoInputSchema, type Task } from "@/lib/todo-validation";

// The assistant API (Jarvis): one owner's tasks, behind a long random bearer token.
type Repository = ReturnType<typeof createTodoRepository>;
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
const optionalDue = { startAt: z.iso.datetime().nullable().optional(), dueAt: z.iso.datetime().nullable().optional(), allDay: z.boolean().optional(), color: z.enum(taskColors).optional(), priority: z.enum(taskPriorities).optional() };
const operation = z.discriminatedUnion("op", [
  z.object({ op: z.literal("add"), title: z.string(), description: z.string().optional(), parentId: id.nullable().optional(), ...optionalDue }),
  z.object({ op: z.literal("edit"), id, title: z.string().optional(), description: z.string().optional(), ...optionalDue }),
  z.object({ op: z.literal("complete"), id, done: z.boolean().default(true), includeSubtasks: z.boolean().default(false) }),
  z.object({ op: z.literal("delete"), id }),
  z.object({ op: z.literal("move"), id, parentId: id.nullable() }),
  z.object({ op: z.literal("merge"), id, intoId: id, title: z.string().optional(), description: z.string().optional() }),
]);

const fail = (status: number, error: string): AgentResult => ({ status, body: { ok: false, error } });
const done = (body: Record<string, unknown> = {}): AgentResult => ({ status: 200, body: { ok: true, ...body } });

function validInput(base: Pick<Task, "title" | "description" | "color" | "priority" | "startAt" | "dueAt" | "allDay">) {
  const parsed = todoInputSchema.safeParse(base);
  return parsed.success ? { ok: true as const, data: parsed.data } : { ok: false as const, error: parsed.error.issues[0].message };
}

export async function listTasks(repository: Repository): Promise<AgentResult> {
  return done({ tasks: await repository.list() });
}

/** Applies one assistant operation. Pure apart from the repository; unit-tested with PGlite. */
export async function runOperation(repository: Repository, raw: unknown): Promise<AgentResult> {
  const parsed = operation.safeParse(raw);
  if (!parsed.success) return fail(400, parsed.error.issues[0].message);
  const request = parsed.data;
  switch (request.op) {
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
