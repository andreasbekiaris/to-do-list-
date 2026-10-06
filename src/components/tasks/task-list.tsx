"use client";
import { type DragEvent, type FormEvent, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowUpRight, CalendarDays, CornerDownRight, GripVertical, LoaderCircle, MoveRight } from "lucide-react";
import { moveTask } from "@/app/tasks/actions";
import { dueStatus, taskColorClasses, type Task } from "@/lib/todo-validation";
import { Button } from "@/components/ui/button";
import { CompleteTask } from "./task-controls";
import { TaskDialog } from "./dialog";
import { TaskEditor } from "./task-editor";

export function DueBadge({ task }: { task: Task }) {
  if (!task.dueAt) return null;
  const status = dueStatus(task);
  const options = { month: "short", day: "numeric", year: "numeric" } as const;
  const end = new Date(task.dueAt).toLocaleString(undefined, { ...options, ...(task.allDay ? { timeZone: "UTC" } : { hour: "numeric", minute: "2-digit" }) });
  const start = task.startAt ? new Date(task.startAt).toLocaleDateString(undefined, { ...options, ...(task.allDay ? { timeZone: "UTC" } : {}) }) : null;
  const text = start ? `${start} – ${end}` : end;
  return <span suppressHydrationWarning className={`inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-xs ${status === "overdue" ? "bg-red-50 text-red-700" : status === "today" ? "bg-amber-50 text-amber-800" : "bg-muted text-muted-foreground"}`}><CalendarDays className="size-3.5 shrink-0" aria-hidden="true" /><span suppressHydrationWarning>{status === "overdue" ? "Overdue · " : status === "today" ? "Today · " : ""}{text}</span></span>;
}
function moveOptions(task: Task, tasks: Task[]) {
  const byId = new Map(tasks.map(item => [item.id, item]));
  const isDescendant = (candidate: Task) => {
    let parentId = candidate.parentId;
    while (parentId) {
      if (parentId === task.id) return true;
      parentId = byId.get(parentId)?.parentId ?? null;
    }
    return false;
  };
  return tasks.filter(candidate => candidate.id !== task.id && !isDescendant(candidate));
}

function MoveTaskDialog({ task, tasks, onClose }: { task: Task; tasks: Task[]; onClose: () => void }) {
  const [parentId, setParentId] = useState(task.parentId ?? "");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    startTransition(async () => {
      const result = await moveTask(task.id, parentId || null);
      if (result.ok) onClose();
      else setError(result.error);
    });
  }
  return <TaskDialog title={`Move “${task.title}”`} onClose={onClose} busy={pending}>
    <form onSubmit={submit} className="space-y-5">
      <label className="block text-sm font-medium">New parent<select aria-label="New parent" value={parentId} onChange={event => setParentId(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-input bg-background px-3 outline-none focus:ring-2 focus:ring-ring"><option value="">Top level</option>{moveOptions(task, tasks).map(candidate => <option key={candidate.id} value={candidate.id}>{candidate.parentTitle ? `${candidate.parentTitle} › ` : ""}{candidate.title}</option>)}</select></label>
      <p className="text-xs leading-5 text-muted-foreground">Choose another task to place this inside it, or choose Top level to take it out of its current parent.</p>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex justify-end gap-2 border-t border-border pt-5"><Button type="button" variant="ghost" onClick={onClose} disabled={pending}>Cancel</Button><Button type="submit" disabled={pending}>{pending ? <><LoaderCircle className="animate-spin" />Moving…</> : <><MoveRight />Move task</>}</Button></div>
    </form>
  </TaskDialog>;
}

export function TaskList({ tasks, allTasks = tasks, showParent = false, outParentId, outLabel = "Drop here to move to the top level" }: { tasks: Task[]; allTasks?: Task[]; showParent?: boolean; outParentId?: string | null; outLabel?: string }) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | "out" | null>(null);
  const [movingTask, setMovingTask] = useState<Task | null>(null);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  function runMove(id: string, parentId: string | null, description: string) {
    setMessage("");
    startTransition(async () => {
      const result = await moveTask(id, parentId);
      setDraggedId(null);
      setDropTarget(null);
      setMessage(result.ok ? description : result.error);
    });
  }
  function startDrag(event: DragEvent<HTMLElement>, task: Task) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("application/x-thread-task", task.id);
    event.dataTransfer.setData("text/plain", task.id);
    setDraggedId(task.id);
  }
  function droppedId(event: DragEvent) {
    return event.dataTransfer.getData("application/x-thread-task") || event.dataTransfer.getData("text/plain") || draggedId;
  }
  return <div>
    <p id="task-drag-help" className="mb-3 text-xs text-muted-foreground">Drag a card onto another task to make it a subtask. Use its move handle for touch or keyboard.</p>
    {outParentId !== undefined && <div data-drop-zone="out" onDragOver={event => { if (draggedId) { event.preventDefault(); event.dataTransfer.dropEffect = "move"; setDropTarget("out"); } }} onDragLeave={() => setDropTarget(current => current === "out" ? null : current)} onDrop={event => { event.preventDefault(); const id = droppedId(event); if (id) runMove(id, outParentId, outParentId ? "Task moved one level up." : "Task moved to the top level."); }} className={`mb-4 flex min-h-14 items-center justify-center rounded-2xl border border-dashed px-4 text-center text-sm transition-colors ${dropTarget === "out" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>{outLabel}</div>}
    {message && <p role="status" className={`mb-4 text-sm ${message.startsWith("Task moved") ? "text-primary" : "text-destructive"}`}>{message}</p>}
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{tasks.map(task => <article key={task.id} draggable={!pending} onDragStart={event => startDrag(event, task)} onDragEnd={() => { setDraggedId(null); setDropTarget(null); }} onDragOver={event => { if (draggedId && draggedId !== task.id) { event.preventDefault(); event.stopPropagation(); event.dataTransfer.dropEffect = "move"; setDropTarget(task.id); } }} onDragLeave={() => setDropTarget(current => current === task.id ? null : current)} onDrop={event => { event.preventDefault(); event.stopPropagation(); const id = droppedId(event); if (id && id !== task.id) runMove(id, task.id, `Task moved inside “${task.title}”.`); }} aria-describedby="task-drag-help" data-task-id={task.id} data-task-color={task.color} className={`flex min-w-0 cursor-grab flex-col rounded-2xl border border-border p-5 shadow-sm transition-all hover:shadow-md active:cursor-grabbing ${dropTarget === task.id ? "ring-2 ring-primary ring-offset-2" : ""} ${draggedId === task.id ? "opacity-50" : ""} ${taskColorClasses[task.color]}`}>
    {showParent && task.parentTitle && <p className="mb-2 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground"><CornerDownRight className="size-3.5 shrink-0" /><span className="truncate">{task.parentTitle}</span></p>}
    <div className="-ml-2 -mr-2 grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto_auto] items-start gap-1"><CompleteTask task={task} /><Link href={`/tasks/${task.id}`} draggable={false} className="grid min-h-11 min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-2 rounded-lg py-2 text-lg font-medium leading-7 outline-none focus-visible:ring-2 focus-visible:ring-ring"><span data-task-title className={`min-w-0 break-words [overflow-wrap:anywhere] ${task.isDone ? "text-muted-foreground line-through" : ""}`}>{task.title}</span><ArrowUpRight className="mt-1 size-4 shrink-0 text-muted-foreground" aria-hidden="true" /></Link><button type="button" aria-label={`Move ${task.title}`} title="Drag or choose a new parent" onClick={() => setMovingTask(task)} className="flex size-11 shrink-0 cursor-grab items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><GripVertical className="size-4" aria-hidden="true" /></button><TaskEditor task={task} parentId={task.parentId} compact /></div>
    {task.description && <p className="mt-2 line-clamp-3 break-words text-sm leading-6 text-muted-foreground [overflow-wrap:anywhere]">{task.description}</p>}
    <div className="mt-auto pt-5"><DueBadge task={task} />{task.childCount > 0 && <div className="mt-4"><div className="mb-2 flex justify-between text-xs text-muted-foreground"><span>{task.completedChildren} of {task.childCount} subtasks</span><span>{Math.round(task.completedChildren/task.childCount*100)}%</span></div><div role="progressbar" aria-label={`Subtask progress for ${task.title}`} aria-valuenow={task.completedChildren} aria-valuemin={0} aria-valuemax={task.childCount} className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary/75" style={{ width: `${task.completedChildren/task.childCount*100}%` }} /></div></div>}</div>
  </article>)}</div>
    {movingTask && <MoveTaskDialog task={movingTask} tasks={allTasks} onClose={() => setMovingTask(null)} />}
  </div>;
}
