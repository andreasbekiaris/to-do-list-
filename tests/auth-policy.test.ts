import assert from "node:assert/strict";
import test from "node:test";
import { createAuthCallbacks, isAllowedGithubId } from "../src/lib/auth-policy";

test("the allowlist accepts exactly one numeric GitHub account ID", () => {
  assert.equal(isAllowedGithubId("42", "42"), true);
  for (const id of [undefined, null, 42, "43", "andreasbekiaris", "042", " 42", "42 "]) {
    assert.equal(isAllowedGithubId(id, "42"), false);
  }
});

test("missing, blank, and malformed allowlist configuration denies access", () => {
  for (const allowed of [undefined, "", "0", "andreasbekiaris", "42,43", " 42", "42\n"]) {
    assert.equal(isAllowedGithubId(allowed, allowed), false);
  }
});

test("the Auth.js signIn callback denies other accounts and providers", () => {
  const callbacks = createAuthCallbacks("42");
  const user = { id: "untrusted-local-id" };
  assert.equal(callbacks.signIn({ user, account: { type: "oauth", provider: "github", providerAccountId: "42" } }), true);
  assert.equal(callbacks.signIn({ user, account: { type: "oauth", provider: "github", providerAccountId: "43" } }), false);
  assert.equal(callbacks.signIn({ user, account: { type: "oauth", provider: "other", providerAccountId: "42" } }), false);
  assert.equal(callbacks.signIn({ user, account: null }), false);
  assert.equal(createAuthCallbacks(undefined).signIn({ user, account: { type: "oauth", provider: "github", providerAccountId: "42" } }), false);
});

test("JWT identity comes from GitHub and cannot be changed by a session update", () => {
  const callbacks = createAuthCallbacks("42");
  const user = { id: "ignored" };
  const token = callbacks.jwt({ token: {}, user, account: { type: "oauth", provider: "github", providerAccountId: "42" } });
  assert.equal(token?.githubId, "42");
  assert.equal(callbacks.jwt({ token: { githubId: "42" }, user, trigger: "update", session: { githubId: "43" } })?.githubId, "42");
  assert.equal(callbacks.jwt({ token: { githubId: "43" }, user, trigger: "update", session: { githubId: "42" } }), null);
});

test("changing or removing the allowlist revokes an existing session", () => {
  const user = { id: "ignored" };
  assert.equal(createAuthCallbacks("43").jwt({ token: { githubId: "42" }, user }), null);
  assert.equal(createAuthCallbacks(undefined).jwt({ token: { githubId: "42" }, user }), null);
  assert.equal(createAuthCallbacks("42").jwt({ token: {}, user }), null);
});
