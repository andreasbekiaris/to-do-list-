"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Download, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TaskDialog } from "@/components/tasks/dialog";

type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};
function subscribeStandalone(callback: () => void) {
  const query = window.matchMedia("(display-mode: standalone)");
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}
function standalone() {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export function InstallApp() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [open, setOpen] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const isStandalone = useSyncExternalStore(subscribeStandalone, standalone, () => false);
  useEffect(() => {
    const available = (event: Event) => { event.preventDefault(); setPrompt(event as InstallPrompt); };
    const complete = () => { setInstalled(true); setOpen(false); setPrompt(null); };
    window.addEventListener("beforeinstallprompt", available);
    window.addEventListener("appinstalled", complete);
    return () => { window.removeEventListener("beforeinstallprompt", available); window.removeEventListener("appinstalled", complete); };
  }, []);
  if (installed || isStandalone) return null;
  return <>
    <Button variant="outline" aria-label="Install Thread" onClick={() => setOpen(true)}><Download aria-hidden="true" /><span className="hidden sm:inline">Install app</span></Button>
    {open && <TaskDialog title="Thread on your desktop" onClose={() => setOpen(false)} busy={busy}>
      <div className="mb-5 flex items-start gap-3 rounded-xl bg-accent p-4 text-sm leading-6"><Monitor className="mt-1 size-5 shrink-0 text-primary" /><p>Give your tasks their own window and an icon in your Dock or taskbar. Sign in with the same account on every device.</p></div>
      {prompt && <Button className="mb-5 w-full" disabled={busy} onClick={async () => {
        setBusy(true); setError("");
        try {
          await prompt.prompt();
          const choice = await prompt.userChoice;
          if (choice.outcome === "accepted") { setInstalled(true); setOpen(false); }
        } catch { setError("Use your browser’s install menu below to continue."); }
        finally { setPrompt(null); setBusy(false); }
      }}>{busy ? "Opening installer…" : "Install Thread now"}</Button>}
      {error && <p role="alert" className="mb-4 text-sm text-destructive">{error}</p>}
      <div className="space-y-5 text-sm leading-6">
        <section><h3 className="font-semibold">Windows · Chrome or Edge</h3><p className="text-muted-foreground">Open this site in Chrome or Edge. Click the install icon in the address bar, or open the browser menu and choose Install Thread / Install this site as an app. Then pin Thread to your taskbar.</p></section>
        <section><h3 className="font-semibold">Mac · Safari</h3><p className="text-muted-foreground">On macOS Sonoma or later, open this site in Safari, choose File → Add to Dock, then click Add. Chrome’s install option works on Mac too.</p></section>
        <section><h3 className="font-semibold">Phone or tablet</h3><p className="text-muted-foreground">On iPhone or iPad, use Safari → Share → Add to Home Screen. On Android, open Chrome’s menu → Install app or Add to Home screen.</p></section>
        <p className="border-t border-border pt-4 text-muted-foreground">Open Thread online once to prepare it for offline use. If your connection drops, you can keep adding, editing, completing, and deleting tasks; Thread syncs those changes automatically when you reconnect. Signing out clears the private offline copy on that device.</p>
      </div>
    </TaskDialog>}
  </>;
}
