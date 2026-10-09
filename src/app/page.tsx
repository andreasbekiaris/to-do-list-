import { requireUser } from "@/lib/require-user";
import { taskRepository } from "@/lib/tasks";
import { Workspace } from "@/components/workspace";
import { Dashboard } from "@/components/tasks/dashboard";
import { OfflineSnapshot } from "@/components/offline-snapshot";
export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await requireUser();
  const tasks = await (await taskRepository()).list();
  const initialDate = new Date().toISOString().slice(0, 10);
  return <Workspace><OfflineSnapshot tasks={tasks} /><Dashboard tasks={tasks} name={user.name || "there"} initialDate={initialDate} /></Workspace>;
}
