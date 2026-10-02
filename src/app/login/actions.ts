"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn, signOut } from "@/auth";
import { isAuthConfigured } from "@/lib/env";
import { requireUser } from "@/lib/require-user";

// The sign-in action is intentionally public; GitHub identity is checked at callback.
export async function signInWithGitHub() {
  if (!isAuthConfigured()) redirect("/login?error=Configuration");
  try {
    await signIn("github", { redirectTo: "/" });
  } catch (error) {
    if (error instanceof AuthError) redirect("/login?error=SignInFailed");
    throw error;
  }
}

export async function signOutOfApp() {
  await requireUser();
  await signOut({ redirectTo: "/login" });
}
