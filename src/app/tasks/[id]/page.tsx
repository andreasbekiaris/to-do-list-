import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ChevronRight, Layers3 } from "lucide-react";
import { requireUser } from "@/lib/require-user";
import { taskRepository } from "@/lib/tasks";
import { Workspace } from "@/components/workspace";
import { TaskEditor } from "@/components/tasks/task-editor";
import { CompleteTask, DeleteTask } from "@/components/tasks/task-controls";
import { DueBadge, TaskList } from "@/components/tasks/task-list";
export const dynamic = "force-dynamic";

export default async function TaskPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const repository = await taskRepository();
  const [task, breadcrumbs, tasks] = await Promise.all([repository.detail(id), repository.breadcrumbs(id), repository.list()]);
  if (!task) notFound();
  const children = tasks.filter(child => child.parentId === id);
  return <Workspace>
    <nav aria-label="Breadcrumb" className="mb-8"><ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground"><li><Link className="inline-flex min-h-11 items-center hover:text-primary" href="/">All tasks</Link></li>{breadcrumbs.map((item, index) => <li key={item.id} className="flex min-w-0 max-w-full items-center gap-2"><ChevronRight className="size-3.5 shrink-0" aria-hidden="true" />{index === breadcrumbs.length-1 ? <span aria-current="page" className="truncate">{item.title}</span> : <Link className="inline-flex min-h-11 min-w-0 items-center hover:text-primary" href={`/tasks/${item.id}`}><span className="truncate">{item.title}</span></Link>}</li>)}</ol></nav>
    <section className="rounded-2xl border border-border bg-card p-5 sm:p-8"><div className="flex items-start gap-3"><CompleteTask task={task} /><h1 className={`min-w-0 pt-1 font-display text-3xl leading-tight [overflow-wrap:anywhere] sm:text-4xl ${task.isDone ? "text-muted-foreground line-through" : ""}`}>{task.title}</h1></div>
      <div className="mt-5"><DueBadge task={task} /></div>
      <p className={`mt-5 whitespace-pre-wrap break-words text-sm leading-7 [overflow-wrap:anywhere] ${task.description ? "" : "text-muted-foreground"}`}>{task.description || "No notes yet. Add a little context with Edit task."}</p>
      <div className="mt-7 flex flex-wrap justify-between gap-3 border-t border-border pt-5"><TaskEditor task={task} parentId={task.parentId} /><DeleteTask task={task} /></div>
    </section>
    <div className="mb-5 mt-10 flex flex-wrap items-center justify-between gap-4"><div><h2 className="flex items-center gap-2 text-xl font-medium"><Layers3 className="size-5 text-primary" />Smaller steps</h2><p className="mt-2 text-sm text-muted-foreground">{task.completedChildren} of {task.childCount} subtasks complete</p></div><TaskEditor parentId={task.id} /></div>
    {children.length ? <TaskList tasks={children} /> : <div className="rounded-2xl border border-dashed border-border px-5 py-10 text-center text-sm leading-6 text-muted-foreground">Break this task into manageable steps.<br />Each subtask can have its own notes, deadline, and subtasks.</div>}
  </Workspace>;
}
