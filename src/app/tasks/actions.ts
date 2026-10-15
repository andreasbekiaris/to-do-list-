"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/require-user";
import { listRepository } from "@/lib/lists";
import { taskRepository } from "@/lib/tasks";
import { taskListInputSchema, taskListItemInputSchema, type ListResult, type TaskListInput, type TaskListItemInput } from "@/lib/list-validation";
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

export async function saveTaskList(input: TaskListInput, id: string | null, taskId: string): Promise<ListResult> {
  await requireUser();
  const parsed = taskListInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  if (!z.uuid().nullable().safeParse(id).success || !z.uuid().safeParse(taskId).success) return { ok: false, error: "Invalid list." };
  try {
    const repository = await listRepository();
    const savedId = id ? (await repository.editList(id, parsed.data) ? id : undefined) : await repository.createList(parsed.data, taskId);
    if (!savedId) return { ok: false, error: id ? "This list was removed. Refresh and try again." : "This task was removed. Refresh and try again." };
    refreshTasks();
    return { ok: true, id: savedId };
  } catch { return { ok: false, error: "Couldn't save this list. Please try again." }; }
}

export async function deleteTaskList(id: string): Promise<ListResult> {
  await requireUser();
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "Invalid list." };
  try {
    if (!(await (await listRepository()).removeList(id))) return { ok: false, error: "This list was already removed. Refresh the page." };
    refreshTasks();
    return { ok: true };
  } catch { return { ok: false, error: "Couldn't delete this list. Please try again." }; }
}

export async function saveTaskListItem(input: TaskListItemInput, id: string | null, listId: string): Promise<ListResult> {
  await requireUser();
  const parsed = taskListItemInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  if (!z.uuid().nullable().safeParse(id).success || !z.uuid().safeParse(listId).success) return { ok: false, error: "Invalid list item." };
  try {
    const repository = await listRepository();
    const savedId = id ? (await repository.editItem(id, parsed.data) ? id : undefined) : await repository.createItem(parsed.data, listId);
    if (!savedId) return { ok: false, error: id ? "This item was removed. Refresh and try again." : "This list was removed. Refresh and try again." };
    refreshTasks();
    return { ok: true, id: savedId };
  } catch { return { ok: false, error: "Couldn't save this item. Please try again." }; }
}

export async function deleteTaskListItem(id: string): Promise<ListResult> {
  await requireUser();
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "Invalid list item." };
  try {
    if (!(await (await listRepository()).removeItem(id))) return { ok: false, error: "This item was already removed. Refresh the page." };
    refreshTasks();
    return { ok: true };
  } catch { return { ok: false, error: "Couldn't delete this item. Please try again." }; }
}

export async function moveTaskListItem(id: string, direction: "up" | "down"): Promise<ListResult> {
  await requireUser();
  const parsed = z.object({ id: z.uuid(), direction: z.enum(["up", "down"]) }).safeParse({ id, direction });
  if (!parsed.success) return { ok: false, error: "Invalid list item." };
  try {
    if (!(await (await listRepository()).moveItem(id, direction))) return { ok: false, error: "That item can't move any farther." };
    refreshTasks();
    return { ok: true };
  } catch { return { ok: false, error: "Couldn't move this item. Please try again." }; }
}
