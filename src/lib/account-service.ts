import type { AccountRepository } from "../db/account-repository";
import { loginSchema, registrationSchema } from "./account-validation";
import { hashPassword, matchesSetupKey, verifyPassword } from "./passwords";

export class LoginThrottledError extends Error {}

export async function authenticateOwner(input: unknown, repository: AccountRepository) {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return null;
  if (!(await repository.consumeAttempt("login", 10, 15 * 60))) throw new LoginThrottledError();
  const owner = await repository.getOwner();
  const matchesUsername = owner?.username === parsed.data.username;
  const valid = await verifyPassword(parsed.data.password, matchesUsername ? owner?.passwordHash : undefined);
  if (!owner || !matchesUsername || !valid) return null;
  await repository.clearLoginAttempts();
  return { id: owner.id, name: owner.username };
}

export async function registerOwner(input: unknown, setupKey: string | undefined, repository: AccountRepository) {
  const parsed = registrationSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (!setupKey || setupKey.length < 16) return { error: "Account creation isn’t available yet." };
  if (!(await repository.consumeAttempt("register", 5, 15 * 60))) {
    return { error: "Too many setup attempts. Please try again in 15 minutes." };
  }
  if (!matchesSetupKey(parsed.data.setupKey, setupKey)) return { error: "That setup code isn’t correct." };
  if (await repository.getOwner()) return { error: "An account already exists. Please log in." };
  const passwordHash = await hashPassword(parsed.data.password);
  const created = await repository.createOwner(parsed.data.username, passwordHash);
  return created ? { created: true as const } : { error: "An account already exists. Please log in." };
}
