"use client";

import { type FormEvent, useEffect, useState, useSyncExternalStore, useTransition } from "react";
import { Check, Cloud, CloudOff, LoaderCircle, Plus, RotateCw, Trash2 } from "lucide-react";
import { addOfflineTask, completeOfflineTask, deleteOfflineTask, flushOfflineChanges, getOfflineTasks, saveOfflineTask } from "@/lib/offline-store";
import { taskColors, taskColorNames, taskPriorities, taskPriorityNames, type Task, type TaskColor, type TaskPriority } from "@/lib/todo-validation";
import { Button } from "@/components/ui/button";
import { Brand } from "@/components/brand";

const field = "mt-1 min-h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-base outline-none focus:ring-2 focus:ring-ring";
function subscribeOnline(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => { window.removeEventListener("online", callback); window.removeEventListener("offline", callback); };
}
const onlineSnapshot = () => navigator.onLine;

function OfflineEditor({ task, tasks, onTasks }: { task: Task; tasks: Task[]; onTasks: (tasks: Task[]) => void }) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [color, setColor] = useState<TaskColor>(task.color);
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [parentId, setParentId] = useState(task.parentId ?? "");
  const [pending, startTransition] = useTransition();
  const descendants = new Set<string>();
  let changed = true;
  while (changed) {
    changed = false;
    for (const candidate of tasks) if ((candidate.parentId === task.id || (candidate.parentId && descendants.has(candidate.parentId))) && !descendants.has(candidate.id)) { descendants.add(candidate.id); changed = true; }
  }
  return <form className="mt-3 grid gap-3 border-t border-border pt-3 sm:grid-cols-2" onSubmit={(event: FormEvent) => {
    event.preventDefault();
    startTransition(async () => onTasks(await saveOfflineTask({ ...task, title: title.trim(), description, color, priority, parentId: parentId || null })));
  }}>
    <label className="text-sm font-medium sm:col-span-2">Title<input required maxLength={500} value={title} onChange={event => setTitle(event.target.value)} className={field} /></label>
    <label className="text-sm font-medium sm:col-span-2">Notes<textarea maxLength={20000} value={description} onChange={event => setDescription(event.target.value)} className={`${field} min-h-24`} /></label>
    <label className="text-sm font-medium">Priority<select value={priority} onChange={event => setPriority(event.target.value as TaskPriority)} className={field}>{taskPriorities.map(item => <option key={item} value={item}>{taskPriorityNames[item]}</option>)}</select></label>
    <label className="text-sm font-medium">Color<select value={color} onChange={event => setColor(event.target.value as TaskColor)} className={field}>{taskColors.map(item => <option key={item} value={item}>{taskColorNames[item]}</option>)}</select></label>
    <label className="text-sm font-medium sm:col-span-2">Parent<select value={parentId} onChange={event => setParentId(event.target.value)} className={field}><option value="">Top level</option>{tasks.filter(item => item.id !== task.id && !descendants.has(item.id)).map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
    <div className="flex gap-2 sm:col-span-2"><Button type="submit" disabled={pending || !title.trim()}>{pending ? <LoaderCircle className="animate-spin" /> : null}Save offline</Button><Button type="button" variant="ghost" disabled={pending} onClick={() => startTransition(async () => { if (confirm(`Delete “${task.title}” and its subtasks?`)) onTasks(await deleteOfflineTask(task.id)); })}><Trash2 />Delete</Button></div>
  </form>;
}

function OfflineRow({ task, tasks, onTasks }: { task: Task; tasks: Task[]; onTasks: (tasks: Task[]) => void }) {
  const [pending, startTransition] = useTransition();
  return <article className="rounded-2xl border border-border bg-card p-4 shadow-sm">
    <div className="flex min-w-0 items-center gap-3"><button role="checkbox" aria-checked={task.isDone} aria-label={`Complete ${task.title}`} disabled={pending} onClick={() => startTransition(async () => onTasks(await completeOfflineTask(task.id, !task.isDone)))} className={`flex size-10 shrink-0 items-center justify-center rounded-full border-2 ${task.isDone ? "border-primary bg-primary text-white" : "border-border"}`}>{pending ? <LoaderCircle className="size-4 animate-spin" /> : task.isDone ? <Check className="size-4" /> : null}</button><div className="min-w-0 flex-1"><h2 className={`truncate font-medium ${task.isDone ? "text-muted-foreground line-through" : ""}`}>{task.title}</h2><p className="truncate text-xs text-muted-foreground">{task.parentTitle ? `Inside ${task.parentTitle} · ` : ""}{taskPriorityNames[task.priority]} priority{task.dueAt ? ` · Due ${new Date(task.dueAt).toLocaleDateString()}` : ""}</p></div></div>
    <details className="mt-2"><summary className="cursor-pointer py-2 text-sm font-medium text-primary">Edit task</summary><OfflineEditor task={task} tasks={tasks} onTasks={onTasks} /></details>
  </article>;
}

export function OfflineDashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [ready, setReady] = useState(false);
  const online = useSyncExternalStore(subscribeOnline, onlineSnapshot, () => false);
  const [message, setMessage] = useState("Loading this device’s saved tasks…");
  const [title, setTitle] = useState("");
  const [pending, startTransition] = useTransition();
  useEffect(() => {
    let cancelled = false;
    const reconnect = async () => {
      if (!navigator.onLine) return;
      setMessage("Connection restored. Syncing now…");
      const result = await flushOfflineChanges();
      if (!cancelled && (result === "synced" || result === "empty")) window.location.replace("/");
      else if (!cancelled && result === "auth") setMessage("Reconnect, then sign in again to sync these changes.");
      else if (!cancelled) setMessage("Couldn’t sync yet. Your changes remain saved on this device.");
    };
    void getOfflineTasks().then(saved => { if (!cancelled) { setTasks(saved); setReady(true); setMessage(saved.length ? "Working offline. Changes will sync automatically." : "No saved tasks are available on this device yet."); } }).catch(() => { if (!cancelled) { setReady(true); setMessage("Offline storage is unavailable in this browser."); } });
    window.addEventListener("online", reconnect);
    return () => { cancelled = true; window.removeEventListener("online", reconnect); };
  }, []);
  const open = tasks.filter(task => !task.isDone);
  const completed = tasks.filter(task => task.isDone).sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""));
  return <div className="min-h-dvh bg-background"><header className="border-b border-border bg-card"><div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-4"><Brand /><span className={`flex items-center gap-2 text-sm ${online ? "text-primary" : "text-muted-foreground"}`}>{online ? <Cloud className="size-4" /> : <CloudOff className="size-4" />}{online ? "Reconnecting" : "Offline"}</span></div></header><main id="main-content" className="mx-auto max-w-4xl px-5 py-8">
    <h1 className="font-display text-4xl">Thread, even offline.</h1><p role="status" className="mt-3 text-sm text-muted-foreground">{message}</p>
    <form className="mt-7 flex flex-col gap-2 sm:flex-row" onSubmit={event => { event.preventDefault(); if (!title.trim()) return; startTransition(async () => { setTasks(await addOfflineTask(title)); setTitle(""); }); }}><input aria-label="New offline task" value={title} onChange={event => setTitle(event.target.value)} placeholder="Add a task while offline…" className={`${field} mt-0 flex-1`} /><Button type="submit" disabled={!ready || pending || !title.trim()}>{pending ? <LoaderCircle className="animate-spin" /> : <Plus />}Add task</Button></form>
    {!ready ? <div className="py-16 text-center"><LoaderCircle className="mx-auto animate-spin text-primary" /></div> : <>
      <div className="mt-8 space-y-3">{open.map(task => <OfflineRow key={task.id} task={task} tasks={tasks} onTasks={setTasks} />)}{!open.length && <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">No open tasks saved on this device.</div>}</div>
      {!!completed.length && <details className="mt-6 rounded-2xl border border-border bg-card"><summary className="cursor-pointer px-4 py-4 font-medium">Completed history ({completed.length})</summary><div className="space-y-3 border-t border-border p-3">{completed.map(task => <OfflineRow key={task.id} task={task} tasks={tasks} onTasks={setTasks} />)}</div></details>}
    </>}
    <div className="mt-8 flex flex-wrap gap-2"><Button variant="outline" disabled={!online} onClick={() => startTransition(async () => { const result = await flushOfflineChanges(); if (result === "synced" || result === "empty") window.location.replace("/"); })}><RotateCw />Try sync now</Button></div>
    <p className="mt-8 text-xs leading-5 text-muted-foreground">Offline changes are stored privately in this browser’s IndexedDB and sent through your authenticated Thread session when the connection returns. Signing out clears the offline copy.</p>
  </main></div>;
}
