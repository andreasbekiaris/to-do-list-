import { createHash } from "node:crypto";
import type { NextAuthConfig } from "next-auth";
import type { OwnerAccount } from "../db/account-repository";

function passwordVersion(passwordHash: string) {
  return createHash("sha256").update(passwordHash).digest("base64url");
}

export function createAuthCallbacks(getOwner: () => Promise<OwnerAccount | null>) {
  return {
    async jwt({ token, user, account }) {
      const signingIn = !!user;
      if (user) {
        if (account?.provider !== "credentials" || !user.id) return null;
        token.ownerId = user.id;
      }
      if (typeof token.ownerId !== "string") return null;
      try {
        const owner = await getOwner();
        if (!owner || owner.id !== token.ownerId) return null;
        const currentPasswordVersion = passwordVersion(owner.passwordHash);
        if (signingIn) token.passwordVersion = currentPasswordVersion;
        if (token.passwordVersion !== currentPasswordVersion) return null;
        token.name = owner.username;
        return token;
      } catch {
        return null;
      }
    },
    session({ session, token }) {
      session.user.id = typeof token.ownerId === "string" ? token.ownerId : "";
      session.user.name = token.name;
      return session;
    },
  } satisfies NonNullable<NextAuthConfig["callbacks"]>;
}
