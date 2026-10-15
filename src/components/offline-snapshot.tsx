"use client";

import { useEffect } from "react";
import { cacheServerLists, cacheServerTasks } from "@/lib/offline-store";
import type { ReferenceList } from "@/lib/list-validation";
import type { Task } from "@/lib/todo-validation";

export function OfflineSnapshot({ tasks, lists, listTaskId }: { tasks: Task[]; lists?: ReferenceList[]; listTaskId?: string }) {
  useEffect(() => {
    void Promise.all([
      cacheServerTasks(tasks),
      lists && listTaskId ? cacheServerLists(listTaskId, lists) : Promise.resolve(),
    ]).catch(() => undefined);
  }, [tasks, lists, listTaskId]);
  return null;
}
