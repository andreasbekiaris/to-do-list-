import "server-only";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isAuthConfigured } from "@/lib/env";

/** Call inside every protected page, data function, and server action. */
export async function requireUser() {
  if (!isAuthConfigured()) redirect("/login");

  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  return session.user;
}
