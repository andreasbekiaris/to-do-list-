"use client";
import { useState, useTransition } from "react";
import { Plus, Pencil } from "lucide-react";
import { saveTask } from "@/app/tasks/actions";
import { taskColors, taskColorNames, taskColorSwatches, taskPriorities, taskPriorityNames, type Task, type TaskColor, type TaskPriority } from "@/lib/todo-validation";
import { Button } from "@/components/ui/button";
import { TaskDialog } from "./dialog";

const inputClass = "mt-2 min-h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-base outline-none focus:ring-2 focus:ring-ring";
function localDateTime(task?: Task) {
  if (!task?.dueAt) return { startDate: "", date: "", time: "" };
  if (task.allDay) return { startDate: task.startAt?.slice(0, 10) ?? "", date: task.dueAt.slice(0, 10), time: "" };
  const date = new Date(task.dueAt);
  const pad = (n: number) => String(n).padStart(2, "0");
  const inputDate = (value: Date) => `${value.getFullYear()}-${pad(value.getMonth()+1)}-${pad(value.getDate())}`;
  return { startDate: task.startAt ? inputDate(new Date(task.startAt)) : "", date: inputDate(date), time: `${pad(date.getHours())}:${pad(date.getMinutes())}` };
}
function Editor({ task, parentId, defaultDate, onClose }: { task?: Task; parentId: string | null; defaultDate?: string; onClose: () => void }) {
  const initial = localDateTime(task);
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [color, setColor] = useState<TaskColor>(task?.color ?? "sage");
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? "none");
  const [startDate, setStartDate] = useState(initial.startDate);
  const [date, setDate] = useState(initial.date || defaultDate || "");
  const [time, setTime] = useState(initial.time);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  return <TaskDialog title={task ? "Edit task" : parentId ? "Add a subtask" : "A new little plan"} onClose={onClose} busy={pending}>
    <form onSubmit={event => { event.preventDefault(); setError(""); startTransition(async () => {
      try {
        const allDay = !!date && !time;
        const dueAt = date ? new Date(time ? `${date}T${time}` : `${date}T00:00:00.000Z`).toISOString() : null;
        const startAt = startDate ? new Date(allDay ? `${startDate}T00:00:00.000Z` : `${startDate}T00:00`).toISOString() : null;
        const result = await saveTask({ title, description, color, priority, startAt, dueAt, allDay }, task?.id ?? null, parentId);
        if (result.ok) onClose(); else setError(result.error);
      } catch { setError("Couldn't save. Check your connection and try again."); }
    }); }} className="space-y-5">
      <label className="block text-sm font-medium">Title<input autoFocus required maxLength={500} value={title} onChange={e => setTitle(e.target.value)} disabled={pending} className={inputClass} placeholder="What would you like to do?" /></label>
      <label className="block text-sm font-medium">Notes <span className="font-normal text-muted-foreground">(optional)</span><textarea maxLength={20000} value={description} onChange={e => setDescription(e.target.value)} disabled={pending} className={`${inputClass} min-h-28 resize-y`} placeholder="Add a little context, a link, or your next step…" /></label>
      <fieldset disabled={pending}><legend className="mb-3 text-sm font-medium">Task color</legend><div className="grid grid-cols-3 gap-2 sm:grid-cols-6">{taskColors.map(item => <label key={item} className={`flex min-h-14 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border px-2 text-xs transition-all ${color === item ? "border-primary ring-2 ring-ring ring-offset-2 ring-offset-card" : "border-border hover:bg-muted"}`}><input className="sr-only" type="radio" name="taskColor" value={item} checked={color === item} onChange={() => setColor(item)} /><span className={`size-5 rounded-full ${taskColorSwatches[item]}`} aria-hidden="true" /><span>{taskColorNames[item]}</span></label>)}</div></fieldset>
      <label className="block text-sm font-medium">Priority<select aria-label="Priority" value={priority} onChange={event => setPriority(event.target.value as TaskPriority)} disabled={pending} className={inputClass}>{taskPriorities.map(item => <option key={item} value={item}>{taskPriorityNames[item]}</option>)}</select></label>
      <div className="grid grid-cols-1 gap-4 min-[400px]:grid-cols-2 min-[640px]:grid-cols-3">
        <label className="block min-w-0 text-sm font-medium">Start date <span className="font-normal text-muted-foreground">(optional)</span><input type="date" min="1900-01-01" max={date || "9999-12-31"} value={startDate} onChange={e => setStartDate(e.target.value)} disabled={pending} className={inputClass} /></label>
        <label className="block min-w-0 text-sm font-medium">Due date<input type="date" min={startDate || "1900-01-01"} max="9999-12-31" value={date} onChange={e => {setDate(e.target.value); if (!e.target.value) { setStartDate(""); setTime(""); }}} disabled={pending} className={inputClass} /></label>
        <label className="block min-w-0 text-sm font-medium">Time <span className="font-normal text-muted-foreground">(optional)</span><input type="time" value={time} onChange={e => setTime(e.target.value)} disabled={!date || pending} className={inputClass} /></label>
      </div>
      <p className="text-xs leading-5 text-muted-foreground">Add a start date to make a multi-day window. Leave time blank for all-day dates; times use this device’s timezone.</p>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-5"><Button variant="ghost" type="button" onClick={onClose} disabled={pending}>Cancel</Button><Button type="submit" disabled={pending}>{pending ? "Saving…" : task ? "Save changes" : "Add task"}</Button></div>
    </form>
  </TaskDialog>;
}
export function TaskEditor({ task, parentId = null, compact = false, defaultDate }: { task?: Task; parentId?: string | null; compact?: boolean; defaultDate?: string }) {
  const [open, setOpen] = useState(false);
  const label = task ? `Edit ${task.title}` : parentId ? "Add subtask" : "New task";
  return <>{compact && task
    ? <button type="button" aria-label={label} title="Quick edit" onClick={() => setOpen(true)} className="flex size-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Pencil className="size-4" aria-hidden="true" /></button>
    : <Button variant={task ? "outline" : "default"} onClick={() => setOpen(true)}>{task ? <Pencil aria-hidden="true" /> : <Plus aria-hidden="true" />}{task ? "Edit task" : parentId ? "Add subtask" : "New task"}</Button>}
    {open && <Editor task={task} parentId={parentId} defaultDate={defaultDate} onClose={() => setOpen(false)} />}</>;
}
