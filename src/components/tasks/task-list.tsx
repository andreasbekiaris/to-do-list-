"use client";
import Link from "next/link";
import { ArrowUpRight, CalendarDays, CornerDownRight } from "lucide-react";
import { dueStatus, taskColorClasses, type Task } from "@/lib/todo-validation";
import { CompleteTask } from "./task-controls";

export function DueBadge({ task }: { task: Task }) {
  if (!task.dueAt) return null;
  const status = dueStatus(task);
  const text = new Date(task.dueAt).toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", ...(task.allDay ? { timeZone: "UTC" } : { hour: "numeric", minute: "2-digit" }) });
  return <span suppressHydrationWarning className={`inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-xs ${status === "overdue" ? "bg-red-50 text-red-700" : status === "today" ? "bg-amber-50 text-amber-800" : "bg-muted text-muted-foreground"}`}><CalendarDays className="size-3.5 shrink-0" aria-hidden="true" /><span suppressHydrationWarning>{status === "overdue" ? "Overdue · " : status === "today" ? "Today · " : ""}{text}</span></span>;
}
export function TaskList({ tasks, showParent = false }: { tasks: Task[]; showParent?: boolean }) {
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{tasks.map(task => <article key={task.id} data-task-color={task.color} className={`flex min-w-0 flex-col rounded-2xl border border-border p-5 shadow-sm transition-shadow hover:shadow-md ${taskColorClasses[task.color]}`}>
    {showParent && task.parentTitle && <p className="mb-2 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground"><CornerDownRight className="size-3.5 shrink-0" /><span className="truncate">{task.parentTitle}</span></p>}
    <div className="-ml-2 flex items-start gap-1"><CompleteTask task={task} /><Link href={`/tasks/${task.id}`} className="flex min-h-11 min-w-0 flex-1 items-start justify-between gap-3 rounded-lg py-2 text-lg font-medium leading-7 outline-none focus-visible:ring-2 focus-visible:ring-ring"><span className={`break-words [overflow-wrap:anywhere] ${task.isDone ? "text-muted-foreground line-through" : ""}`}>{task.title}</span><ArrowUpRight className="mt-1 size-4 shrink-0 text-muted-foreground" aria-hidden="true" /></Link></div>
    {task.description && <p className="mt-2 line-clamp-3 break-words text-sm leading-6 text-muted-foreground [overflow-wrap:anywhere]">{task.description}</p>}
    <div className="mt-auto pt-5"><DueBadge task={task} />{task.childCount > 0 && <div className="mt-4"><div className="mb-2 flex justify-between text-xs text-muted-foreground"><span>{task.completedChildren} of {task.childCount} subtasks</span><span>{Math.round(task.completedChildren/task.childCount*100)}%</span></div><div role="progressbar" aria-label={`Subtask progress for ${task.title}`} aria-valuenow={task.completedChildren} aria-valuemin={0} aria-valuemax={task.childCount} className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary/75" style={{ width: `${task.completedChildren/task.childCount*100}%` }} /></div></div>}</div>
  </article>)}</div>;
}
