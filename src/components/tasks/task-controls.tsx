"use client";
import { useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, LoaderCircle, Trash2 } from "lucide-react";
import { completeTask, deleteTask } from "@/app/tasks/actions";
import type { Task } from "@/lib/todo-validation";
import { Button } from "@/components/ui/button";
import { TaskDialog } from "./dialog";

export function CompleteTask({ task }: { task: Task }) {
  const [done, setDone] = useOptimistic(task.isDone);
  const [pending, startTransition] = useTransition();
  const [confirmation, setConfirmation] = useState<{ ids: string[]; message: string } | null>(null);
  const [error, setError] = useState("");
  function toggle(nextDone: boolean, scope: "ask" | "only" | "tree" = "ask", ids: string[] = []) {
    setError("");
    startTransition(async () => {
      setDone(nextDone);
      try {
        const result = await completeTask(task.id, nextDone, scope, ids);
        if (!result.ok) {
          if (result.confirmIds) setConfirmation({ ids: result.confirmIds, message: result.error });
          else { setError(result.error); setConfirmation(null); }
        } else setConfirmation(null);
      } catch { setError("Couldn't update. Check your connection and try again."); setConfirmation(null); }
    });
  }
  return <div className="shrink-0">
    <button role="checkbox" aria-checked={done} aria-label={`Complete ${task.title}`} disabled={pending} onClick={() => toggle(!done)} className="group flex size-11 items-center justify-center rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait">
      <span className={`flex size-6 items-center justify-center rounded-full border-2 transition-colors ${done ? "border-primary bg-primary text-white" : "border-border bg-card group-hover:border-primary"}`}>{pending ? <LoaderCircle className="size-3.5 animate-spin" /> : done ? <Check className="size-3.5" /> : null}</span>
    </button>
    {error && <p role="alert" className="max-w-52 text-xs text-destructive">{error}</p>}
    {confirmation && <TaskDialog title={confirmation.message} onClose={() => setConfirmation(null)} busy={pending}>
      <p className="mb-6 text-sm leading-6 text-muted-foreground">You can finish this task on its own, or include its unfinished subtasks at every level.</p>
      <div className="flex flex-wrap gap-2"><Button disabled={pending} onClick={() => toggle(true, "tree", confirmation.ids)}>Complete all</Button><Button variant="outline" disabled={pending} onClick={() => toggle(true, "only")}>Only this task</Button><Button variant="ghost" disabled={pending} onClick={() => setConfirmation(null)}>Cancel</Button></div>
    </TaskDialog>}
  </div>;
}
export function DeleteTask({ task }: { task: Task }) {
  const router = useRouter();
  const [confirmation, setConfirmation] = useState<{ ids: string[]; message: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  return <><Button variant="ghost" className="text-destructive" onClick={() => {setError(""); setConfirmation({ ids: [], message: "Delete this task?" });}}><Trash2 aria-hidden="true" />Delete task</Button>
    {confirmation && <TaskDialog title={confirmation.message} busy={pending} onClose={() => setConfirmation(null)}>
      <p className="mb-5 text-sm leading-6 text-muted-foreground">This permanently removes the task. If there are subtasks, you’ll confirm their total before they’re removed too.</p>
      {error && <p role="alert" className="mb-4 text-sm text-destructive">{error}</p>}
      <div className="flex gap-2"><Button className="bg-destructive text-white hover:bg-destructive/90" disabled={pending} onClick={() => startTransition(async () => {
        try {
          const result = await deleteTask(task.id, confirmation.ids);
          if (result.ok) { setConfirmation(null); router.push(task.parentId ? `/tasks/${task.parentId}` : "/"); router.refresh(); }
          else if (result.confirmIds) setConfirmation({ ids: result.confirmIds, message: result.error });
          else setError(result.error);
        } catch { setError("Couldn't delete. Check your connection and try again."); }
      })}>{pending ? "Deleting…" : "Delete permanently"}</Button><Button variant="ghost" disabled={pending} onClick={() => setConfirmation(null)}>Cancel</Button></div>
    </TaskDialog>}
  </>;
}
