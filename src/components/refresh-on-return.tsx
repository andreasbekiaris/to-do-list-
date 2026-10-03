"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function RefreshOnReturn() {
  const router = useRouter();
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      // Avoid interrupting an open task editor, and coalesce focus/visibility events.
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (document.visibilityState !== "visible" || !navigator.onLine || document.querySelector("dialog[open]")) return;
        router.refresh();
      }, 150);
    };
    window.addEventListener("focus", refresh);
    window.addEventListener("online", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("online", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [router]);
  return null;
}
