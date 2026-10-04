import type { Task } from "@/lib/todo-validation";

export type CalendarView = "list" | "day" | "week" | "month";

const pad = (value: number) => String(value).padStart(2, "0");

export function dateKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parseDateKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}

export function taskDateKey(task: Pick<Task, "dueAt" | "allDay">) {
  if (!task.dueAt) return null;
  return task.allDay ? task.dueAt.slice(0, 10) : dateKey(new Date(task.dueAt));
}

export function addDays(value: string, amount: number) {
  const date = parseDateKey(value);
  date.setDate(date.getDate() + amount);
  return dateKey(date);
}

export function startOfWeek(value: string) {
  const date = parseDateKey(value);
  const offset = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - offset);
  return dateKey(date);
}

export function weekKeys(value: string) {
  const first = startOfWeek(value);
  return Array.from({ length: 7 }, (_, index) => addDays(first, index));
}

export function moveMonth(value: string, amount: number) {
  const date = parseDateKey(value);
  date.setDate(1);
  date.setMonth(date.getMonth() + amount);
  return dateKey(date);
}

export function monthKeys(value: string) {
  const date = parseDateKey(value);
  const monthStart = dateKey(new Date(date.getFullYear(), date.getMonth(), 1, 12));
  const first = startOfWeek(monthStart);
  return Array.from({ length: 42 }, (_, index) => addDays(first, index));
}

export function groupTasksByDate(tasks: Task[]) {
  const groups = new Map<string, Task[]>();
  for (const task of tasks) {
    const key = taskDateKey(task);
    if (!key) continue;
    groups.set(key, [...(groups.get(key) ?? []), task]);
  }
  return groups;
}
