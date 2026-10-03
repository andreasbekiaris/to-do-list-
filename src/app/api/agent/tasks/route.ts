import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { createTodoRepository } from "@/db/todo-repository";
import { agentToken, listTasks, runOperation, tokenMatches, type AgentResult } from "@/lib/agent-api";

// Assistant access (Jarvis). Off unless JARVIS_API_TOKEN is set; every request needs that token.
export const dynamic = "force-dynamic";

async function guarded(request: Request, handle: () => Promise<AgentResult>) {
  const token = agentToken();
  if (!token) return Response.json({ ok: false, error: "Not found" }, { status: 404 });
  if (!tokenMatches(request.headers.get("authorization"), token)) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  try {
    const result = await handle();
    return Response.json(result.body, { status: result.status, headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ ok: false, error: "Couldn't reach your tasks. Please try again." }, { status: 500 });
  }
}
const repository = () => createTodoRepository(query => getDb().execute(query));

export async function GET(request: Request) {
  return guarded(request, () => listTasks(repository()));
}

export async function POST(request: Request) {
  return guarded(request, async () => {
    const body: unknown = await request.json().catch(() => null);
    const result = await runOperation(repository(), body);
    if (result.status === 200) {
      revalidatePath("/");
      revalidatePath("/tasks/[id]", "page");
    }
    return result;
  });
}
