import "server-only";

import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { createAuthCallbacks } from "@/lib/auth-policy";
import { accountRepository } from "@/lib/accounts";
import { authenticateOwner, LoginThrottledError } from "@/lib/account-service";
import { isAuthConfigured } from "@/lib/env";

class LoginThrottled extends CredentialsSignin { code = "rate_limited"; }
class LoginUnavailable extends CredentialsSignin { code = "unavailable"; }

export const { handlers, auth, signIn, signOut } = NextAuth(() => ({
  providers: [Credentials({
    credentials: { username: { label: "Username" }, password: { label: "Password", type: "password" } },
    async authorize(credentials) {
      if (!isAuthConfigured()) return null;
      try {
        return await authenticateOwner(credentials, accountRepository());
      } catch (error) {
        if (error instanceof LoginThrottledError) throw new LoginThrottled();
        throw new LoginUnavailable();
      }
    },
  })],
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/login", error: "/login" },
  callbacks: createAuthCallbacks(() => accountRepository().getOwner()),
}));
