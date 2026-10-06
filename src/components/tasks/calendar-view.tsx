"use client";

import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { addDays, dateKey, groupTasksByDate, monthKeys, moveMonth, parseDateKey, weekKeys, type CalendarView } from "@/lib/calendar";
import { taskColorSwatches, taskOccursOnDate, type Task } from "@/lib/todo-validation";
import { Button } from "@/components/ui/button";
import { CompleteTask } from "./task-controls";
import { TaskEditor } from "./task-editor";
import { TaskList } from "./task-list";

function displayDay(key: string, options: Intl.DateTimeFormatOptions) {
  return parseDateKey(key).toLocaleDateString(undefined, options);
}

function CalendarTask({ task }: { task: Task }) {
  const time = task.startAt ? "Date range" : task.allDay ? "All day" : new Date(task.dueAt!).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return <div data-calendar-task={task.id} className="min-w-0 rounded-xl border border-border bg-card/80 p-1 shadow-sm">
    <Link href={`/tasks/${task.id}`} aria-label={task.title} title={task.title} className="block min-w-0 rounded-lg px-2 pt-2 outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <span className="flex min-w-0 items-center gap-2"><span className={`size-2.5 shrink-0 rounded-full ${taskColorSwatches[task.color]}`} /><span className={`truncate text-sm font-medium ${task.isDone ? "text-muted-foreground line-through" : ""}`}>{task.title}</span></span>
    </Link>
    <div className="flex items-center justify-between">
      <CompleteTask task={task} />
      <span suppressHydrationWarning className="truncate px-1 text-xs text-muted-foreground">{time}</span>
      <TaskEditor task={task} parentId={task.parentId} compact />
    </div>
  </div>;
}

function EmptyPeriod({ text, selectedDate }: { text: string; selectedDate: string }) {
  return <div className="rounded-2xl border border-dashed border-border bg-card/50 px-6 py-12 text-center"><CalendarDays className="mx-auto mb-4 size-9 text-primary" /><h3 className="font-display text-xl">Nothing scheduled here.</h3><p className="mx-auto mb-5 mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{text} Tasks without deadlines remain in All tasks.</p><TaskEditor defaultDate={selectedDate} /></div>;
}

function PeriodNavigation({ view, selectedDate, onDate }: { view: Exclude<CalendarView, "list">; selectedDate: string; onDate: (date: string) => void }) {
  const keys = weekKeys(selectedDate);
  const title = view === "day"
    ? displayDay(selectedDate, { weekday: "long", month: "long", day: "numeric", year: "numeric" })
    : view === "week"
      ? `${displayDay(keys[0], { month: "short", day: "numeric" })} – ${displayDay(keys[6], { month: "short", day: "numeric", year: "numeric" })}`
      : displayDay(selectedDate, { month: "long", year: "numeric" });
  const move = (amount: number) => onDate(view === "day" ? addDays(selectedDate, amount) : view === "week" ? addDays(selectedDate, amount * 7) : moveMonth(selectedDate, amount));
  return <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
    <div className="flex items-center justify-between gap-2"><Button variant="ghost" size="icon" aria-label={`Previous ${view}`} onClick={() => move(-1)}><ChevronLeft /></Button><h2 className="text-center font-display text-xl sm:text-2xl">{title}</h2><Button variant="ghost" size="icon" aria-label={`Next ${view}`} onClick={() => move(1)}><ChevronRight /></Button></div>
    <div className="flex flex-wrap items-center justify-center gap-2"><Button variant="outline" onClick={() => onDate(dateKey(new Date()))}>Today</Button><label className="sr-only" htmlFor="calendar-date">Selected date</label><input id="calendar-date" type="date" value={selectedDate} onChange={event => event.target.value && onDate(event.target.value)} className="min-h-11 rounded-xl border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" /></div>
  </div>;
}

function DayView({ tasks, selectedDate }: { tasks: Task[]; selectedDate: string }) {
  const visible = tasks.filter(task => taskOccursOnDate(task, selectedDate));
  return visible.length ? <><p className="mb-4 text-sm text-muted-foreground">{visible.length} {visible.length === 1 ? "task" : "tasks"} scheduled</p><TaskList tasks={visible} showParent /></> : <EmptyPeriod text="Choose another date or add a task for this day." selectedDate={selectedDate} />;
}

function WeekView({ tasks, selectedDate, onDate, onDay }: { tasks: Task[]; selectedDate: string; onDate: (date: string) => void; onDay: () => void }) {
  const keys = weekKeys(selectedDate);
  const grouped = groupTasksByDate(tasks, keys);
  const count = keys.reduce((total, key) => total + (grouped.get(key)?.length ?? 0), 0);
  if (!count) return <EmptyPeriod text="This week is clear. Add a dated task or move to another week." selectedDate={selectedDate} />;
  return <div className="grid gap-3 lg:grid-cols-7">{keys.map(key => <section key={key} className="min-w-0 rounded-2xl border border-border bg-card/40 p-2" aria-label={displayDay(key, { weekday: "long", month: "long", day: "numeric" })}>
    <button type="button" onClick={() => { onDate(key); onDay(); }} className="mb-2 min-h-11 w-full rounded-xl px-2 text-left hover:bg-muted"><span className="block text-xs uppercase tracking-wide text-muted-foreground">{displayDay(key, { weekday: "short" })}</span><span className="text-lg font-medium">{displayDay(key, { month: "short", day: "numeric" })}</span></button>
    <div className="space-y-2">{(grouped.get(key) ?? []).map(task => <CalendarTask key={task.id} task={task} />)}</div>
  </section>)}</div>;
}

function MonthView({ tasks, selectedDate, onDate, onDay }: { tasks: Task[]; selectedDate: string; onDate: (date: string) => void; onDay: () => void }) {
  const keys = monthKeys(selectedDate);
  const grouped = groupTasksByDate(tasks, keys);
  const month = parseDateKey(selectedDate).getMonth();
  const active = keys.filter(key => parseDateKey(key).getMonth() === month && (grouped.get(key)?.length ?? 0) > 0);
  return <>
    <div className="hidden overflow-hidden rounded-2xl border border-border bg-border md:grid md:grid-cols-7 md:gap-px">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(day => <div key={day} className="bg-muted px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{day}</div>)}{keys.map(key => {
      const outside = parseDateKey(key).getMonth() !== month;
      return <section key={key} className={`min-h-36 min-w-0 bg-card p-2 ${outside ? "opacity-45" : ""}`} aria-label={displayDay(key, { weekday: "long", month: "long", day: "numeric" })}>
        <button type="button" onClick={() => { onDate(key); onDay(); }} className="mb-1 flex size-9 items-center justify-center rounded-full text-sm hover:bg-muted">{parseDateKey(key).getDate()}</button>
        <div className="space-y-1">{(grouped.get(key) ?? []).map(task => <CalendarTask key={task.id} task={task} />)}</div>
      </section>;
    })}</div>
    <div className="space-y-4 md:hidden">{active.length ? active.map(key => <section key={key}><button type="button" onClick={() => { onDate(key); onDay(); }} className="mb-2 min-h-11 rounded-xl px-2 text-left font-medium hover:bg-muted">{displayDay(key, { weekday: "long", month: "long", day: "numeric" })}</button><div className="space-y-2">{(grouped.get(key) ?? []).map(task => <CalendarTask key={task.id} task={task} />)}</div></section>) : <EmptyPeriod text="This month is clear. Add a dated task or move to another month." selectedDate={selectedDate} />}</div>
  </>;
}

export function CalendarViewPanel({ view, tasks, selectedDate, onDate, onView }: { view: Exclude<CalendarView, "list">; tasks: Task[]; selectedDate: string; onDate: (date: string) => void; onView: (view: CalendarView) => void }) {
  const undated = tasks.filter(task => !task.dueAt).length;
  return <><PeriodNavigation view={view} selectedDate={selectedDate} onDate={onDate} />
    {view === "day" ? <DayView tasks={tasks} selectedDate={selectedDate} /> : view === "week" ? <WeekView tasks={tasks} selectedDate={selectedDate} onDate={onDate} onDay={() => onView("day")} /> : <MonthView tasks={tasks} selectedDate={selectedDate} onDate={onDate} onDay={() => onView("day")} />}
    {undated > 0 && <p className="mt-6 text-center text-sm text-muted-foreground">{undated} {undated === 1 ? "task has" : "tasks have"} no deadline. <button className="font-medium text-primary underline underline-offset-4" onClick={() => onView("list")}>View all tasks</button></p>}
  </>;
}
