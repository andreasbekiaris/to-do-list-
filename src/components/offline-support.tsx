"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { flushOfflineChanges } from "@/lib/offline-store";

async function primeOfflinePage(registration: ServiceWorkerRegistration) {
  try {
    const html = await fetch("/offline", { cache: "reload" }).then(response => response.text());
    const urls = [...html.matchAll(/(?:src|href)="([^"#]+)"/g)].map(match => match[1]).filter(url => url.startsWith("/_next/static/"));
    registration.active?.postMessage({ type: "CACHE_URLS", urls });
  } catch { /* The next online visit will retry. */ }
}

export function OfflineSupport() {
  const router = useRouter();
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("indexedDB" in window)) return;
    let cancelled = false;
    void navigator.serviceWorker.register("/sw.js", { scope: "/" }).then(async registration => {
      if (!cancelled) await primeOfflinePage(registration);
    }).catch(() => undefined);
    const sync = async () => {
      const result = await flushOfflineChanges();
      if (!cancelled && result === "synced") router.refresh();
    };
    const useOfflineWorkspace = () => {
      // A document navigation lets the service worker serve the cached page when
      // Next's client router cannot reach its server-component endpoint.
      if (window.location.pathname !== "/offline") window.location.assign(new URL("/offline", window.location.origin));
    };
    void sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", useOfflineWorkspace);
    return () => {
      cancelled = true;
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", useOfflineWorkspace);
    };
  }, [router]);
  return null;
}
