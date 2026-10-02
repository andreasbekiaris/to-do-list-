import "server-only";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isAllowedGithubId } from "@/lib/auth-policy";
import { isAuthConfigured } from "@/lib/env";

/** Call inside every protected page, data function, and server action. */
export async function requireUser() {
  if (!isAuthConfigured()) redirect("/login");

  const session = await auth();
  if (
    !session?.user ||
    !isAllowedGithubId(session.user.githubId, process.env.ALLOWED_GITHUB_ID)
  ) {
    redirect("/login");
  }

  return session.user;
}
