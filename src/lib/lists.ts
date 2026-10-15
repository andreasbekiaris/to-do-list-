import "server-only";
import { getDb } from "@/db";
import { createListRepository } from "@/db/list-repository";
import { requireUser } from "@/lib/require-user";

export async function listRepository() {
  await requireUser();
  return createListRepository(query => getDb().execute(query));
}
