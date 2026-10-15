"use client";

import { type FormEvent, useRef, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, ExternalLink, Link2, ListPlus, LoaderCircle, Pencil, Plus, StickyNote, Trash2 } from "lucide-react";
import { deleteTaskList, deleteTaskListItem, moveTaskListItem, saveTaskList, saveTaskListItem } from "@/app/tasks/actions";
import type { ReferenceList, ReferenceListItem } from "@/lib/list-validation";
import { Button } from "@/components/ui/button";
import { TaskDialog } from "./dialog";

const field = "mt-2 min-h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-base outline-none focus:ring-2 focus:ring-ring";

function ListEditor({ taskId, list, onClose }: { taskId: string; list?: ReferenceList; onClose: () => void }) {
  const [title, setTitle] = useState(list?.title ?? "");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  return <TaskDialog title={list ? "Rename list" : "Add a list"} onClose={onClose} busy={pending}>
    <form onSubmit={(event: FormEvent) => {
      event.preventDefault();
      setError("");
      startTransition(async () => {
        const result = await saveTaskList({ title }, list?.id ?? null, taskId);
        if (result.ok) onClose(); else setError(result.error);
      });
    }} className="space-y-5">
      <label className="block text-sm font-medium">List name<input autoFocus required maxLength={200} value={title} onChange={event => setTitle(event.target.value)} disabled={pending} className={field} placeholder="Shoes, books to read, places to compare…" /></label>
      <p className="text-xs leading-5 text-muted-foreground">Use a list for things you want to keep together without turning each one into a task.</p>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex justify-end gap-2 border-t border-border pt-5"><Button type="button" variant="ghost" onClick={onClose} disabled={pending}>Cancel</Button><Button type="submit" disabled={pending}>{pending ? <><LoaderCircle className="animate-spin" />Saving…</> : list ? "Save name" : "Add list"}</Button></div>
    </form>
  </TaskDialog>;
}

function ItemEditor({ listId, item, onClose }: { listId: string; item?: ReferenceListItem; onClose: () => void }) {
  const titleRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(item?.title ?? "");
  const [url, setUrl] = useState(item?.url ?? "");
  const [note, setNote] = useState(item?.note ?? "");
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [pending, startTransition] = useTransition();
  return <TaskDialog title={item ? "Edit list item" : "Add a list item"} onClose={onClose} busy={pending}>
    <form onSubmit={(event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
      const addAnother = submitter?.dataset.addAnother === "true";
      setError("");
      setFeedback("");
      startTransition(async () => {
        const result = await saveTaskListItem({ title, url, note }, item?.id ?? null, listId);
        if (!result.ok) { setError(result.error); return; }
        if (!item && addAnother) {
          setTitle(""); setUrl(""); setNote(""); setFeedback("Item added. Add another when you're ready.");
          requestAnimationFrame(() => titleRef.current?.focus());
        } else onClose();
      });
    }} className="space-y-5">
      <label className="block text-sm font-medium">Name<input ref={titleRef} autoFocus required maxLength={500} value={title} onChange={event => setTitle(event.target.value)} disabled={pending} className={field} placeholder="What do you want to remember?" /></label>
      <label className="block text-sm font-medium">Link <span className="font-normal text-muted-foreground">(optional)</span><input type="url" inputMode="url" maxLength={2048} value={url} onChange={event => setUrl(event.target.value)} disabled={pending} className={field} placeholder="https://…" /></label>
      <label className="block text-sm font-medium">Note <span className="font-normal text-muted-foreground">(optional)</span><textarea maxLength={5000} value={note} onChange={event => setNote(event.target.value)} disabled={pending} className={`${field} min-h-24 resize-y`} placeholder="Size, price, color, why you like it…" /></label>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {feedback && <p role="status" className="text-sm text-primary">{feedback}</p>}
      <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-5"><Button type="button" variant="ghost" onClick={onClose} disabled={pending}>Cancel</Button>{!item && <Button type="submit" variant="outline" data-add-another="true" disabled={pending}>{pending ? <LoaderCircle className="animate-spin" /> : <Plus />}Add & another</Button>}<Button type="submit" disabled={pending}>{pending ? <><LoaderCircle className="animate-spin" />Saving…</> : item ? "Save changes" : "Add item"}</Button></div>
    </form>
  </TaskDialog>;
}

type DeleteTarget = { type: "list"; value: ReferenceList } | { type: "item"; value: ReferenceListItem };

function DeleteDialog({ target, onClose }: { target: DeleteTarget; onClose: () => void }) {
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const isList = target.type === "list";
  const name = target.value.title;
  const itemCount = isList ? target.value.items.length : 0;
  return <TaskDialog title={`Delete “${name}”?`} onClose={onClose} busy={pending}>
    <p className="text-sm leading-6 text-muted-foreground">{isList
      ? itemCount ? `This removes the list and all ${itemCount} ${itemCount === 1 ? "item" : "items"} inside it. The task itself will stay.` : "This removes the empty list. The task itself will stay."
      : "This removes the item from its list. It will not affect the task."}</p>
    {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
    <div className="mt-6 flex justify-end gap-2 border-t border-border pt-5"><Button type="button" variant="ghost" onClick={onClose} disabled={pending}>Cancel</Button><Button type="button" className="bg-destructive text-white hover:bg-destructive/90" disabled={pending} onClick={() => startTransition(async () => {
      const result = isList ? await deleteTaskList(target.value.id) : await deleteTaskListItem(target.value.id);
      if (result.ok) onClose(); else setError(result.error);
    })}>{pending ? <><LoaderCircle className="animate-spin" />Deleting…</> : <><Trash2 />{isList ? "Delete list" : "Delete item"}</>}</Button></div>
  </TaskDialog>;
}

function linkLabel(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, ""); }
  catch { return "Open link"; }
}

export function CollectionBoard({ taskId, lists }: { taskId: string; lists: ReferenceList[] }) {
  const [creatingList, setCreatingList] = useState(false);
  const [editingList, setEditingList] = useState<ReferenceList | null>(null);
  const [editingItem, setEditingItem] = useState<{ listId: string; item?: ReferenceListItem } | null>(null);
  const [deleting, setDeleting] = useState<DeleteTarget | null>(null);
  const [activeMove, setActiveMove] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  function move(item: ReferenceListItem, direction: "up" | "down") {
    setMessage("");
    setActiveMove(item.id);
    startTransition(async () => {
      const result = await moveTaskListItem(item.id, direction);
      setMessage(result.ok ? `“${item.title}” moved ${direction}.` : result.error);
      setActiveMove(null);
    });
  }
  return <section aria-labelledby="task-lists-heading" className="mt-10">
    <div className="mb-5 flex flex-wrap items-end justify-between gap-4"><div><h2 id="task-lists-heading" className="flex items-center gap-2 text-xl font-medium"><ListPlus className="size-5 text-primary" aria-hidden="true" />Lists</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Save options, links, and reference notes here. These items are not tasks, so they do not have checkboxes or deadlines.</p></div><Button variant="outline" onClick={() => setCreatingList(true)}><Plus />Add list</Button></div>
    {message && <p role="status" className={`mb-4 text-sm ${message.startsWith("Couldn't") || message.startsWith("That") ? "text-destructive" : "text-primary"}`}>{message}</p>}
    {lists.length ? <div className="grid items-start gap-5 lg:grid-cols-2">{lists.map(list => <article key={list.id} data-list-title={list.title} className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <header className="flex min-w-0 items-center gap-2 border-b border-border px-4 py-3 sm:px-5"><div className="min-w-0 flex-1"><h3 className="truncate font-medium">{list.title}</h3><p className="mt-0.5 text-xs text-muted-foreground">{list.items.length} {list.items.length === 1 ? "item" : "items"}</p></div><button type="button" aria-label={`Rename ${list.title}`} onClick={() => setEditingList(list)} className="flex size-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Pencil className="size-4" /></button><button type="button" aria-label={`Delete ${list.title}`} onClick={() => setDeleting({ type: "list", value: list })} className="flex size-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Trash2 className="size-4" /></button></header>
      {list.items.length ? <ol className="divide-y divide-border">{list.items.map((item, index) => <li key={item.id} data-list-item-id={item.id} className="group flex min-w-0 gap-3 px-4 py-4 sm:px-5">
        <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground" aria-hidden="true">{index + 1}</span>
        <div className="min-w-0 flex-1"><p className="break-words font-medium [overflow-wrap:anywhere]">{item.title}</p>{item.url && <a href={item.url} target="_blank" rel="noreferrer" className="mt-1.5 inline-flex max-w-full items-center gap-1.5 rounded text-xs text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Link2 className="size-3.5 shrink-0" aria-hidden="true" /><span className="truncate">{linkLabel(item.url)}</span><ExternalLink className="size-3 shrink-0" aria-hidden="true" /><span className="sr-only"> for {item.title}</span></a>}{item.note && <p className="mt-2 flex gap-1.5 whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground [overflow-wrap:anywhere]"><StickyNote className="mt-1 size-3.5 shrink-0" aria-hidden="true" /><span>{item.note}</span></p>}</div>
        <div className="grid shrink-0 grid-cols-2 sm:flex"><button type="button" aria-label={`Move ${item.title} up`} disabled={pending || index === 0} onClick={() => move(item, "up")} className="flex size-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{activeMove === item.id && pending ? <LoaderCircle className="size-4 animate-spin" /> : <ArrowUp className="size-4" />}</button><button type="button" aria-label={`Move ${item.title} down`} disabled={pending || index === list.items.length - 1} onClick={() => move(item, "down")} className="flex size-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><ArrowDown className="size-4" /></button><button type="button" aria-label={`Edit ${item.title}`} disabled={pending} onClick={() => setEditingItem({ listId: list.id, item })} className="flex size-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Pencil className="size-4" /></button><button type="button" aria-label={`Delete ${item.title}`} disabled={pending} onClick={() => setDeleting({ type: "item", value: item })} className="flex size-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Trash2 className="size-4" /></button></div>
      </li>)}</ol> : <div className="px-5 py-8 text-center text-sm leading-6 text-muted-foreground">Nothing saved yet.<br />Add the first item whenever you find it.</div>}
      <div className="border-t border-border bg-muted/35 p-3 sm:px-5"><Button variant="ghost" size="sm" onClick={() => setEditingItem({ listId: list.id })}><Plus />Add item</Button></div>
    </article>)}</div> : <div className="rounded-2xl border border-dashed border-border bg-card/60 px-6 py-10 text-center"><ListPlus className="mx-auto size-8 text-primary" strokeWidth={1.5} /><h3 className="mt-4 font-display text-xl">Keep choices without making more tasks.</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">For example: create a “Shoes” list, then save each pair with its shop link, size, price, or a quick note.</p></div>}
    {creatingList && <ListEditor taskId={taskId} onClose={() => setCreatingList(false)} />}
    {editingList && <ListEditor taskId={taskId} list={editingList} onClose={() => setEditingList(null)} />}
    {editingItem && <ItemEditor listId={editingItem.listId} item={editingItem.item} onClose={() => setEditingItem(null)} />}
    {deleting && <DeleteDialog target={deleting} onClose={() => setDeleting(null)} />}
  </section>;
}
