import { localDateKey, taskEndDateKey, taskOccursOnDate, type Task } from "@/lib/todo-validation";

export type CalendarView = "list" | "day" | "week" | "month";

export function dateKey(date: Date) {
  return localDateKey(date);
}

export function parseDateKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}

export function taskDateKey(task: Pick<Task, "dueAt" | "allDay">) {
  return taskEndDateKey(task);
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

export function groupTasksByDate(tasks: Task[], keys: string[]) {
  const groups = new Map(keys.map(key => [key, [] as Task[]]));
  for (const key of keys) for (const task of tasks) if (taskOccursOnDate(task, key)) groups.get(key)!.push(task);
  return groups;
}
