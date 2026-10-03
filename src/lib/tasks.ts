import "server-only";
import { getDb } from "@/db";
import { createTodoRepository } from "@/db/todo-repository";
import { requireUser } from "@/lib/require-user";

// Every production access to task data goes through this authenticated factory.
export async function taskRepository() {
  await requireUser();
  return createTodoRepository(query => getDb().execute(query));
}
