"use client";

import { useState } from "react";
import { Check, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TaskDialog } from "@/components/tasks/dialog";

const themes = [
  { id: "sage", name: "Sage", description: "Calm greens and soft cream", swatches: ["#2e5947", "#f7f8f4", "#e7eee3"] },
  { id: "lavender", name: "Lavender", description: "Gentle violet and cool mist", swatches: ["#66528f", "#f8f6fb", "#ece7f5"] },
  { id: "sunset", name: "Sunset", description: "Warm terracotta and sand", swatches: ["#9a4f38", "#fff8f1", "#f5e5d6"] },
  { id: "midnight", name: "Midnight", description: "Deep navy for low-light focus", swatches: ["#7fc7aa", "#101a24", "#1c2a36"] },
] as const;
type ThemeId = typeof themes[number]["id"];

function currentTheme(): ThemeId {
  const value = document.documentElement.dataset.theme;
  return themes.some(theme => theme.id === value) ? value as ThemeId : "sage";
}
function applyTheme(theme: ThemeId) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem("thread-theme", theme);
}

export function ThemePicker() {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<ThemeId>("sage");
  function choose(next: ThemeId) {
    applyTheme(next);
    setTheme(next);
  }
  return <>
    <Button variant="outline" aria-label="Choose theme" onClick={() => { setTheme(currentTheme()); setOpen(true); }}><Palette aria-hidden="true" /><span className="hidden lg:inline">Theme</span></Button>
    {open && <TaskDialog title="Choose your theme" onClose={() => setOpen(false)}>
      <p className="mb-5 text-sm leading-6 text-muted-foreground">Make Thread feel comfortable on this device. Your tasks and their colors stay the same.</p>
      <div className="grid gap-3 sm:grid-cols-2">{themes.map(item => <button key={item.id} type="button" aria-pressed={theme === item.id} onClick={() => choose(item.id)} className={`min-h-28 rounded-2xl border p-4 text-left transition-all ${theme === item.id ? "border-primary ring-2 ring-ring ring-offset-2 ring-offset-card" : "border-border hover:bg-muted"}`}>
        <span className="mb-3 flex items-center justify-between"><span className="flex -space-x-1">{item.swatches.map(color => <span key={color} className="size-7 rounded-full border-2 border-card" style={{ backgroundColor: color }} />)}</span>{theme === item.id && <span className="flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground"><Check className="size-4" /></span>}</span>
        <span className="block font-medium">{item.name}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">{item.description}</span>
      </button>)}</div>
      <div className="mt-5 flex justify-end"><Button onClick={() => setOpen(false)}>Done</Button></div>
    </TaskDialog>}
  </>;
}
