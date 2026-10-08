"use client";

import { useState } from "react";
import { CalendarDays, CalendarRange, CalendarSearch, ListTodo, Search, Sprout } from "lucide-react";
import type { CalendarView } from "@/lib/calendar";
import { filters, matchesFilter, type Task, type TaskFilter } from "@/lib/todo-validation";
import { CalendarViewPanel } from "./calendar-view";
import { TaskEditor } from "./task-editor";
import { CompletedTaskHistory, TaskList } from "./task-list";

const views = [
  { id: "list", label: "All tasks", icon: ListTodo },
  { id: "day", label: "Day", icon: CalendarDays },
  { id: "week", label: "Week", icon: CalendarRange },
  { id: "month", label: "Month", icon: CalendarSearch },
] as const;

function ListView({ tasks }: { tasks: Task[] }) {
  const [filter, setFilter] = useState<TaskFilter>("All");
  const [search, setSearch] = useState("");
  const query = search.trim().toLowerCase();
  const matchesSearch = (task: Task) => !query || `${task.title} ${task.description}`.toLowerCase().includes(query);
  const visible = tasks.filter(task => !task.isDone && matchesFilter(task, filter) && matchesSearch(task));
  const completed = filter === "All" ? tasks.filter(task => task.isDone && matchesSearch(task)) : [];
  const filtered = filter === "Done" ? tasks.filter(task => matchesFilter(task, filter) && matchesSearch(task)) : visible;
  return <>
    <div className="mb-8 flex flex-col justify-between gap-4 border-b border-border pb-5 lg:flex-row lg:items-center">
      <div className="flex flex-wrap gap-1" aria-label="Task filters">{filters.map(item => <button key={item} aria-pressed={filter === item} onClick={() => setFilter(item)} className={`min-h-11 rounded-full px-4 text-sm font-medium transition-colors ${filter === item ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>{item}</button>)}</div>
      <label className="flex min-h-11 items-center gap-2 rounded-xl border border-border bg-card px-3"><Search className="size-4 text-muted-foreground" aria-hidden="true" /><input aria-label="Search tasks" type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Find a task…" className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" /></label>
    </div>
    <div className="mb-4 flex items-center justify-between text-sm text-muted-foreground"><span className="flex items-center gap-2"><ListTodo className="size-4" />{search ? "Search results" : filter === "All" ? "Your open projects & tasks" : `${filter} tasks`}</span><span aria-live="polite">{filtered.length} {filtered.length === 1 ? "task" : "tasks"}</span></div>
    {filtered.length ? <TaskList tasks={filtered} allTasks={tasks} showParent={filter !== "All" || !!search} outParentId={null} /> : <div className="rounded-2xl border border-dashed border-border bg-card/60 px-6 py-16 text-center"><Sprout className="mx-auto mb-5 size-10 text-primary" strokeWidth={1.5} /><h2 className="font-display text-2xl">{tasks.length ? "A little breathing room." : "Start with something small."}</h2><p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-muted-foreground">{search ? "No tasks match your search. Try another word." : tasks.length ? `Nothing in ${filter.toLowerCase()} right now. Your other tasks are in All.` : "A home project, an errand, an idea. Add a task, then break it into smaller steps whenever you need."}</p>{!tasks.length && <div className="mt-6"><TaskEditor /></div>}</div>}
    {filter === "All" && <CompletedTaskHistory tasks={completed} />}
  </>;
}

export function Dashboard({ tasks, name, initialDate }: { tasks: Task[]; name: string; initialDate: string }) {
  const [view, setView] = useState<CalendarView>("list");
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const open = tasks.filter(task => !task.isDone).length;
  return <>
    <p className="mb-5 flex items-center gap-2 text-xs font-medium tracking-widest text-muted-foreground"><span className="size-1.5 rounded-full bg-primary" />MY WORKSPACE</p>
    <div className="flex flex-wrap items-end justify-between gap-6"><div><p className="mb-3 text-sm text-muted-foreground">Welcome back, {name}.</p><h1 className="font-display text-4xl leading-tight tracking-tight sm:text-5xl">A little plan. A clearer day.</h1><p className="mt-4 text-sm text-muted-foreground">{open ? `${open} open ${open === 1 ? "task" : "tasks"}. One step at a time.` : "Make room for what matters. Start with one small task."}</p></div><TaskEditor defaultDate={view === "list" ? undefined : selectedDate} /></div>
    <div className="my-8 flex overflow-x-auto rounded-2xl border border-border bg-card p-1" aria-label="Dashboard view">{views.map(item => { const Icon = item.icon; return <button key={item.id} aria-pressed={view === item.id} onClick={() => setView(item.id)} className={`flex min-h-11 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 text-sm font-medium transition-colors ${view === item.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}><Icon className="size-4" aria-hidden="true" />{item.label}</button>; })}</div>
    {view === "list" ? <ListView tasks={tasks} /> : <CalendarViewPanel view={view} tasks={tasks} selectedDate={selectedDate} onDate={setSelectedDate} onView={setView} />}
  </>;
}
