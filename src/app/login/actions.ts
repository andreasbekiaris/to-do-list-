"use server";

import { AuthError, CredentialsSignin } from "next-auth";
import { redirect } from "next/navigation";
import { signIn, signOut } from "@/auth";
import { isAuthConfigured, isRegistrationConfigured } from "@/lib/env";
import { requireUser } from "@/lib/require-user";
import { registerOwner } from "@/lib/account-service";
import { accountRepository } from "@/lib/accounts";
import { loginSchema, type AuthFormState } from "@/lib/account-validation";

export async function logIn(_previous: AuthFormState, formData: FormData): Promise<AuthFormState> {
  if (!isAuthConfigured()) return { error: "Login isn’t available yet. Please try again later." };
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  try {
    await signIn("credentials", { ...parsed.data, redirectTo: "/" });
  } catch (error) {
    if (error instanceof CredentialsSignin && error.code === "rate_limited") {
      return { error: "Too many login attempts. Please try again in 15 minutes." };
    }
    if (error instanceof CredentialsSignin && error.code === "unavailable") {
      return { error: "Login is temporarily unavailable. Please try again later." };
    }
    if (error instanceof AuthError) return { error: "Username or password is incorrect." };
    throw error;
  }
  return {};
}

export async function createAccount(_previous: AuthFormState, formData: FormData): Promise<AuthFormState> {
  if (!isRegistrationConfigured()) return { error: "Account creation isn’t available yet." };
  try {
    const result = await registerOwner(Object.fromEntries(formData), process.env.ACCOUNT_SETUP_KEY, accountRepository());
    if (result.error) return { error: result.error };
  } catch {
    return { error: "We couldn’t create your account. Please try again later." };
  }
  redirect("/login?created=1");
}

export async function signOutOfApp() {
  await requireUser();
  await signOut({ redirectTo: "/login" });
}
