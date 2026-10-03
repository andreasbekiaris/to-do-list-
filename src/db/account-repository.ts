import { sql, type SQL } from "drizzle-orm";
import { z } from "zod";

const ownerSchema = z.object({ id: z.uuid(), username: z.string(), passwordHash: z.string() });
export type OwnerAccount = z.infer<typeof ownerSchema>;
type Execute = (query: SQL) => Promise<{ rows: Record<string, unknown>[] }>;

export function createAccountRepository(execute: Execute) {
  return {
    async getOwner(): Promise<OwnerAccount | null> {
      const result = await execute(sql`SELECT id, username, password_hash AS "passwordHash" FROM owner_accounts LIMIT 1`);
      return result.rows[0] ? ownerSchema.parse(result.rows[0]) : null;
    },
    async createOwner(username: string, passwordHash: string) {
      // The unique singleton constraint makes simultaneous registrations safe.
      const result = await execute(sql`INSERT INTO owner_accounts (username, password_hash)
        VALUES (${username}, ${passwordHash}) ON CONFLICT DO NOTHING RETURNING id`);
      return result.rows.length === 1;
    },
    async consumeAttempt(bucket: "login" | "register", limit: number, seconds: number) {
      const result = await execute(sql`INSERT INTO auth_attempts (bucket, attempts, resets_at)
        VALUES (${bucket}, 1, now() + ${seconds} * interval '1 second')
        ON CONFLICT (bucket) DO UPDATE SET
          attempts = CASE WHEN auth_attempts.resets_at <= now() THEN 1 ELSE auth_attempts.attempts + 1 END,
          resets_at = CASE WHEN auth_attempts.resets_at <= now() THEN now() + ${seconds} * interval '1 second' ELSE auth_attempts.resets_at END
        WHERE auth_attempts.resets_at <= now() OR auth_attempts.attempts < ${limit}
        RETURNING bucket`);
      return result.rows.length === 1;
    },
    async clearLoginAttempts() {
      await execute(sql`DELETE FROM auth_attempts WHERE bucket = 'login'`);
    },
  };
}

export type AccountRepository = ReturnType<typeof createAccountRepository>;
