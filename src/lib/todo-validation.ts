import { z } from "zod";

export const taskColors = ["sage", "sky", "lavender", "rose", "amber", "slate"] as const;
export type TaskColor = typeof taskColors[number];
export const taskColorNames: Record<TaskColor, string> = {
  sage: "Sage", sky: "Sky", lavender: "Lavender", rose: "Rose", amber: "Amber", slate: "Slate",
};
export const taskColorClasses: Record<TaskColor, string> = {
  sage: "border-t-4 border-t-emerald-500 bg-emerald-50/40",
  sky: "border-t-4 border-t-sky-500 bg-sky-50/40",
  lavender: "border-t-4 border-t-violet-500 bg-violet-50/40",
  rose: "border-t-4 border-t-rose-500 bg-rose-50/40",
  amber: "border-t-4 border-t-amber-500 bg-amber-50/40",
  slate: "border-t-4 border-t-slate-500 bg-slate-50/40",
};
export const taskColorSwatches: Record<TaskColor, string> = {
  sage: "bg-emerald-500", sky: "bg-sky-500", lavender: "bg-violet-500", rose: "bg-rose-500", amber: "bg-amber-500", slate: "bg-slate-500",
};

export const todoInputSchema = z.object({
  title: z.string().trim().min(1, "Give your task a title.").max(500, "Keep the title under 500 characters."),
  description: z.string().max(20000, "Keep notes under 20,000 characters."),
  color: z.enum(taskColors),
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
