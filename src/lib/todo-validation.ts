import { z } from "zod";

export const todoInputSchema = z.object({
  title: z.string().trim().min(1, "Give your task a title.").max(500, "Keep the title under 500 characters."),
  description: z.string().max(20000, "Keep notes under 20,000 characters."),
  dueAt: z.iso.datetime().nullable(),
  allDay: z.boolean(),
}).refine((value) => !value.allDay || (value.dueAt !== null && value.dueAt.endsWith("T00:00:00.000Z")), { message: "Choose a valid due date." });
export type TodoInput = z.infer<typeof todoInputSchema>;
export type Task = TodoInput & { id: string; parentId: string | null; isDone: boolean; childCount: number; completedChildren: number; parentTitle: string | null };
export type TaskResult = { ok: true; id?: string } | { ok: false; error: string; confirmIds?: string[] };
export const filters = ["All", "Today", "Upcoming", "Overdue", "Done"] as const;
export type TaskFilter = typeof filters[number];

export function dueStatus(task: Pick<Task, "dueAt" | "allDay" | "isDone">, now = new Date()) {
  if (!task.dueAt || task.isDone) return "none";
  const due = new Date(task.dueAt);
  const localDay = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const today = localDay(now);
  const dueDay = task.allDay ? task.dueAt.slice(0, 10) : localDay(due);
  if (dueDay < today || (!task.allDay && due.getTime() < now.getTime())) return "overdue";
  return dueDay === today ? "today" : "upcoming";
}
export function matchesFilter(task: Task, filter: TaskFilter, now = new Date()) {
  if (filter === "All") return task.parentId === null;
  if (filter === "Done") return task.isDone;
  if (filter === "Today") {
    if (task.isDone || !task.dueAt) return false;
    const date = new Date(task.dueAt);
    return task.allDay
      ? task.dueAt.slice(0, 10) === `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
      : date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
  }
  return dueStatus(task, now) === filter.toLowerCase();
}
