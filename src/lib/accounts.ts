import "server-only";

import { getDb } from "@/db";
import { createAccountRepository } from "@/db/account-repository";

export function accountRepository() {
  return createAccountRepository((query) => getDb().execute(query));
}

export async function accountAvailability() {
  try {
    const owner = await accountRepository().getOwner();
    return { available: true, hasOwner: !!owner };
  } catch {
    // Do not leak connection strings or database errors into the UI.
    return { available: false, hasOwner: false };
  }
}
