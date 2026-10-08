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
  startAt: z.iso.datetime().nullable(),
  dueAt: z.iso.datetime().nullable(),
  allDay: z.boolean(),
}).superRefine((value, context) => {
  if (value.allDay && (value.dueAt === null || !value.dueAt.endsWith("T00:00:00.000Z") || (value.startAt !== null && !value.startAt.endsWith("T00:00:00.000Z")))) {
    context.addIssue({ code: "custom", message: "Choose valid calendar dates." });
  }
  if (value.startAt && !value.dueAt) context.addIssue({ code: "custom", message: "Choose an end date for the task window." });
  if (value.startAt && value.dueAt && new Date(value.startAt) > new Date(value.dueAt)) context.addIssue({ code: "custom", message: "The start date must be on or before the end date." });
});
export type TodoInput = z.infer<typeof todoInputSchema>;
export type Task = TodoInput & { id: string; parentId: string | null; isDone: boolean; completedAt: string | null; childCount: number; completedChildren: number; parentTitle: string | null };
export type TaskResult = { ok: true; id?: string } | { ok: false; error: string; confirmIds?: string[] };
export const filters = ["All", "Today", "Upcoming", "Overdue", "Done"] as const;
export type TaskFilter = typeof filters[number];

export function localDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function taskEndDateKey(task: Pick<Task, "dueAt" | "allDay">) {
  if (!task.dueAt) return null;
  return task.allDay ? task.dueAt.slice(0, 10) : localDateKey(new Date(task.dueAt));
}
export function taskStartDateKey(task: Pick<Task, "startAt" | "dueAt" | "allDay">) {
  if (!task.startAt) return taskEndDateKey(task);
  return task.allDay ? task.startAt.slice(0, 10) : localDateKey(new Date(task.startAt));
}
export function taskOccursOnDate(task: Pick<Task, "startAt" | "dueAt" | "allDay">, key: string) {
  const start = taskStartDateKey(task);
  const end = taskEndDateKey(task);
  return !!start && !!end && start <= key && key <= end;
}
export function dueStatus(task: Pick<Task, "dueAt" | "allDay" | "isDone">, now = new Date()) {
  if (!task.dueAt || task.isDone) return "none";
  const due = new Date(task.dueAt);
  const today = localDateKey(now);
  const dueDay = task.allDay ? task.dueAt.slice(0, 10) : localDateKey(due);
  if (dueDay < today || (!task.allDay && due.getTime() < now.getTime())) return "overdue";
  return dueDay === today ? "today" : "upcoming";
}
export function matchesFilter(task: Task, filter: TaskFilter, now = new Date()) {
  if (filter === "All") return task.parentId === null;
  if (filter === "Done") return task.isDone;
  if (filter === "Today") {
    if (task.isDone || !task.dueAt) return false;
    return taskOccursOnDate(task, localDateKey(now));
  }
  return dueStatus(task, now) === filter.toLowerCase();
}
