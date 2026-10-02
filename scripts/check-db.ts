import { loadEnvConfig } from "@next/env";
import { neon } from "@neondatabase/serverless";

loadEnvConfig(process.cwd());

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("missing database configuration");
  const sql = neon(url);
  await sql`SELECT id, parent_id, due_at, all_day FROM todos LIMIT 1`;
  console.log("Database connected; the todos migration is available.");
}

main().catch(() => {
  // Driver errors may include connection details; never log the raw error.
  console.error("Database check failed. Check DATABASE_URL and run pnpm db:migrate.");
  process.exitCode = 1;
});
