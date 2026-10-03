import assert from "node:assert/strict";
import test from "node:test";
import type { JWT } from "next-auth/jwt";
import { createAuthCallbacks } from "../src/lib/auth-policy";

const owner = { id: "00000000-0000-4000-8000-000000000042", username: "owner", passwordHash: "never-expose-this" };
const callbacks = createAuthCallbacks(async () => owner);
// Auth.js omits `user` on session refresh, despite its callback parameter type.
const refresh = (token: JWT, session?: unknown) => callbacks.jwt({ token, session, trigger: "update" } as Parameters<typeof callbacks.jwt>[0]);

test("credential sessions use the database owner's ID and expose no password hash", async () => {
  const token = await callbacks.jwt({ token: {}, user: { id: owner.id }, account: { provider: "credentials", type: "credentials", providerAccountId: owner.id } });
  assert.equal(token?.ownerId, owner.id);
  assert.equal(token?.name, owner.username);
  assert.equal(token?.passwordHash, undefined);
});

test("old GitHub sessions, other accounts, and client-supplied identity updates are rejected", async () => {
  assert.equal(await refresh({ githubId: "42" }), null);
  assert.equal(await refresh({ ownerId: "another-account" }, { ownerId: owner.id }), null);
  assert.equal((await refresh({ ownerId: owner.id }, { ownerId: "another-account", name: "changed" }))?.ownerId, owner.id);
  assert.equal(await callbacks.jwt({ token: {}, user: { id: owner.id }, account: { provider: "github", type: "oauth", providerAccountId: owner.id } }), null);
});

test("deleted accounts and database failures close existing sessions", async () => {
  const input = { token: { ownerId: owner.id } } as Parameters<typeof callbacks.jwt>[0];
  assert.equal(await createAuthCallbacks(async () => null).jwt(input), null);
  assert.equal(await createAuthCallbacks(async () => { throw new Error("database unavailable"); }).jwt(input), null);
});
