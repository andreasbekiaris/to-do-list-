import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { createAccountRepository } from "../src/db/account-repository";
import { authenticateOwner, registerOwner, LoginThrottledError } from "../src/lib/account-service";
import { hashPassword, verifyPassword } from "../src/lib/passwords";

const client = new PGlite();
const db = drizzle(client);
const repository = createAccountRepository((query) => db.execute(query));
const setupKey = "test-only-private-setup-code";
const password = "correct horse battery staple";
const registration = { username: "My.Owner", password, confirmPassword: password, setupKey };

before(async () => { await migrate(db, { migrationsFolder: "drizzle" }); });
beforeEach(async () => { await client.exec("TRUNCATE owner_accounts, auth_attempts"); });
after(async () => { await client.close(); });

test("passwords use random salts and only the original password verifies", async () => {
  const first = await hashPassword(password);
  assert.notEqual(first, await hashPassword(password));
  assert.equal(first.includes(password), false);
  assert.equal(await verifyPassword(password, first), true);
  assert.equal(await verifyPassword("wrong password", first), false);
  assert.equal(await verifyPassword(password, "malformed"), false);
});

test("registration validates passwords and requires the private setup code", async () => {
  for (const data of [
    { ...registration, password: "short", confirmPassword: "short" },
    { ...registration, confirmPassword: "does not match" },
    { ...registration, username: "bad username!" },
    { ...registration, setupKey: "incorrect-code" },
  ]) assert.ok((await registerOwner(data, setupKey, repository)).error);
  assert.ok((await registerOwner(registration, undefined, repository)).error);
  assert.equal(await repository.getOwner(), null);
});

test("registration stores a hash, normalizes the username, and accepts correct credentials", async () => {
  assert.equal((await registerOwner(registration, setupKey, repository)).created, true);
  const owner = await repository.getOwner();
  assert.equal(owner?.username, "my.owner");
  assert.notEqual(owner?.passwordHash, password);
  assert.equal(await authenticateOwner({ username: "my.owner", password: "wrong" }, repository), null);
  assert.equal(await authenticateOwner({ username: "unknown", password }, repository), null);
  const user = await authenticateOwner({ username: " MY.OWNER ", password }, repository);
  assert.deepEqual(user, { id: owner?.id, name: "my.owner" });
  assert.equal(await authenticateOwner({ username: "my.owner", password: "x".repeat(129) }, repository), null);
});

test("simultaneous registration creates exactly one owner", async () => {
  const results = await Promise.all([
    registerOwner(registration, setupKey, repository),
    registerOwner({ ...registration, username: "second-owner" }, setupKey, repository),
  ]);
  assert.equal(results.filter((result) => result.created).length, 1);
  assert.equal((await client.query("SELECT id FROM owner_accounts")).rows.length, 1);
  assert.ok((await registerOwner({ ...registration, username: "third-owner" }, setupKey, repository)).error);
});

test("the database prevents bypassing the singleton account restriction", async () => {
  await registerOwner(registration, setupKey, repository);
  await assert.rejects(client.query("INSERT INTO owner_accounts (username, password_hash, singleton) VALUES ('second', 'hash', false)"));
  await assert.rejects(client.query("INSERT INTO owner_accounts (username, password_hash) VALUES ('second', 'hash')"));
});

test("login limits are persistent, atomic, expire, and reset after successful login", async () => {
  await registerOwner(registration, setupKey, repository);
  const results = await Promise.all(Array.from({ length: 12 }, () => repository.consumeAttempt("login", 10, 900)));
  assert.equal(results.filter(Boolean).length, 10);
  await assert.rejects(authenticateOwner({ username: "my.owner", password }, repository), LoginThrottledError);
  await client.exec("UPDATE auth_attempts SET resets_at = now() - interval '1 second' WHERE bucket = 'login'");
  assert.ok(await authenticateOwner({ username: "my.owner", password }, repository));
  assert.equal((await client.query("SELECT * FROM auth_attempts WHERE bucket = 'login'")).rows.length, 0);
});

test("setup-code attempts are limited independently of login", async () => {
  for (let attempt = 0; attempt < 5; attempt++) {
    assert.match((await registerOwner({ ...registration, setupKey: "wrong" }, setupKey, repository)).error ?? "", /isn’t correct/);
  }
  assert.match((await registerOwner(registration, setupKey, repository)).error ?? "", /Too many setup attempts/);
  assert.equal(await repository.getOwner(), null);
});
