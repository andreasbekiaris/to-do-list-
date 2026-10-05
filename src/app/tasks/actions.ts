"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/require-user";
import { taskRepository } from "@/lib/tasks";
import { todoInputSchema, type TodoInput, type TaskResult } from "@/lib/todo-validation";

function refreshTasks() {
  revalidatePath("/");
  revalidatePath("/tasks/[id]", "page");
}
export async function saveTask(input: TodoInput, id: string | null, parentId: string | null): Promise<TaskResult> {
  await requireUser();
  const parsed = todoInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  if (!z.uuid().nullable().safeParse(id).success || !z.uuid().nullable().safeParse(parentId).success) return { ok: false, error: "Invalid task." };
  try {
    const repository = await taskRepository();
    const savedId = id ? (await repository.edit(id, parsed.data) ? id : undefined) : await repository.create(parsed.data, parentId);
    if (!savedId) return { ok: false, error: "This task was removed. Refresh and try again." };
    refreshTasks();
    return { ok: true, id: savedId };
  } catch { return { ok: false, error: "Couldn't save your task. Please try again." }; }
}
export async function completeTask(id: string, done: boolean, scope: "ask" | "only" | "tree" = "ask", expectedIds: string[] = []): Promise<TaskResult> {
  await requireUser();
  if (!z.object({ id: z.uuid(), done: z.boolean(), scope: z.enum(["ask", "only", "tree"]), expectedIds: z.array(z.uuid()).max(10000) }).safeParse({ id, done, scope, expectedIds }).success) return { ok: false, error: "Invalid task." };
  try {
    const result = await (await taskRepository()).complete(id, done, scope, expectedIds);
    if (!result.found) return { ok: false, error: "This task was removed. Refresh the page." };
    if (!result.changed) return { ok: false, error: `Also complete ${result.ids.length} sub-tasks?`, confirmIds: result.ids };
    refreshTasks(); return { ok: true };
  } catch { return { ok: false, error: "Couldn't update this task. Please try again." }; }
}
export async function deleteTask(id: string, expectedIds: string[] = []): Promise<TaskResult> {
  await requireUser();
  if (!z.uuid().safeParse(id).success || !z.array(z.uuid()).max(10000).safeParse(expectedIds).success) return { ok: false, error: "Invalid task." };
  try {
    const result = await (await taskRepository()).remove(id, expectedIds);
    if (!result.found) return { ok: false, error: "This task was already removed. Refresh the page." };
    if (!result.changed) return { ok: false, error: `Delete this task and its ${result.ids.length} sub-tasks?`, confirmIds: result.ids };
    refreshTasks(); return { ok: true };
  } catch { return { ok: false, error: "Couldn't delete this task. Please try again." }; }
}
export async function moveTask(id: string, parentId: string | null): Promise<TaskResult> {
  await requireUser();
  const parsed = z.object({ id: z.uuid(), parentId: z.uuid().nullable() }).safeParse({ id, parentId });
  if (!parsed.success || id === parentId) return { ok: false, error: "Choose a different parent task." };
  try {
    const moved = await (await taskRepository()).move(id, parentId);
    if (!moved) return { ok: false, error: "That move isn't possible. A task can't be placed inside one of its own subtasks." };
    refreshTasks();
    return { ok: true };
  } catch { return { ok: false, error: "Couldn't move this task. Please try again." }; }
}
