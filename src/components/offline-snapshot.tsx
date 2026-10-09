"use client";

import { useEffect } from "react";
import { cacheServerTasks } from "@/lib/offline-store";
import type { Task } from "@/lib/todo-validation";

export function OfflineSnapshot({ tasks }: { tasks: Task[] }) {
  useEffect(() => { void cacheServerTasks(tasks).catch(() => undefined); }, [tasks]);
  return null;
}
