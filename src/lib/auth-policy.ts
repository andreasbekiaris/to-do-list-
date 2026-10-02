import type { NextAuthConfig } from "next-auth";

/** Compare only GitHub's immutable, numeric ID. Missing configuration denies all. */
export function isAllowedGithubId(id: unknown, allowedId: string | undefined) {
  return (
    typeof id === "string" &&
    typeof allowedId === "string" &&
    /^[1-9]\d*$/.test(allowedId) &&
    id === allowedId
  );
}

export function createAuthCallbacks(allowedId: string | undefined) {
  return {
    signIn({ account }) {
      return (
        account?.provider === "github" &&
        isAllowedGithubId(account.providerAccountId, allowedId)
      );
    },
    jwt({ token, account }) {
      if (account) {
        if (
          account.provider !== "github" ||
          !isAllowedGithubId(account.providerAccountId, allowedId)
        ) {
          return null;
        }
        token.githubId = account.providerAccountId;
      }

      // Recheck existing sessions, including after the allowlist changes.
      return isAllowedGithubId(token.githubId, allowedId) ? token : null;
    },
    session({ session, token }) {
      session.user.githubId =
        typeof token.githubId === "string" ? token.githubId : "";
      return session;
    },
  } satisfies NonNullable<NextAuthConfig["callbacks"]>;
}
