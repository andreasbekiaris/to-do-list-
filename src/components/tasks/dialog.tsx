"use client";
import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";

export function TaskDialog({ title, onClose, children, busy = false }: { title: string; onClose: () => void; children: React.ReactNode; busy?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => { const dialog = ref.current; dialog?.showModal(); return () => dialog?.close(); }, []);
  return <dialog ref={ref} aria-labelledby={titleId} onCancel={event => { event.preventDefault(); if (!busy) onClose(); }} className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl border border-border bg-card p-6 text-foreground shadow-xl backdrop:bg-foreground/35">
    <div className="mb-5 flex items-center justify-between gap-4"><h2 id={titleId} className="font-display text-2xl">{title}</h2><button type="button" aria-label="Close dialog" disabled={busy} onClick={onClose} className="flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-muted disabled:opacity-50"><X className="size-5" /></button></div>
    {children}
  </dialog>;
}
