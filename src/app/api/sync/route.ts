import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { createTodoRepository } from "@/db/todo-repository";
import { todoInputSchema } from "@/lib/todo-validation";

export const dynamic = "force-dynamic";

const id = z.uuid();
const operation = z.discriminatedUnion("type", [
  z.object({ type: z.literal("save"), id, parentId: id.nullable(), input: todoInputSchema }),
  z.object({ type: z.literal("complete"), id, done: z.boolean() }),
  z.object({ type: z.literal("delete"), id }),
]);
const requestSchema = z.object({ operations: z.array(operation).max(500) });

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ ok: false, error: "Sign in again to sync." }, { status: 401 });
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ ok: false, error: "Invalid offline changes." }, { status: 400 });
  try {
    const repository = createTodoRepository(query => getDb().execute(query));
    for (const item of parsed.data.operations) {
      if (item.type === "save" && !(await repository.put(item.id, item.input, item.parentId))) {
        return Response.json({ ok: false, error: "A queued task has an invalid parent." }, { status: 409 });
      }
      if (item.type === "complete") {
        const result = await repository.complete(item.id, item.done, "only", []);
        if (!result.found) continue;
      }
      if (item.type === "delete") await repository.removeUnchecked(item.id);
    }
    const tasks = await repository.list();
    revalidatePath("/");
    revalidatePath("/tasks/[id]", "page");
    return Response.json({ ok: true, tasks }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ ok: false, error: "Sync is temporarily unavailable." }, { status: 500 });
  }
}
