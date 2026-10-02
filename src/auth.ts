import "server-only";

import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { createAuthCallbacks } from "@/lib/auth-policy";

export const { handlers, auth, signIn, signOut } = NextAuth(() => ({
  providers: [GitHub({ checks: ["pkce", "state"] })],
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/login", error: "/login" },
  callbacks: createAuthCallbacks(process.env.ALLOWED_GITHUB_ID),
}));
