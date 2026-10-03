import { createServer } from "node:http";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";

async function main() {
  if (!process.env.TEST_DATABASE_KEY) throw new Error("Missing test database key.");
  const client = new PGlite();
  await migrate(drizzle(client), { migrationsFolder: "drizzle" });
  const server = createServer(async (request, response) => {
    response.setHeader("Content-Type", "application/json");
    if (request.url === "/health") return void response.end('{"ready":true}');
    if (request.headers["x-test-database-key"] !== process.env.TEST_DATABASE_KEY) {
      response.writeHead(403); response.end("{}"); return;
    }
    try {
      if (request.url === "/reset" && request.method === "POST") {
        await client.exec("TRUNCATE owner_accounts, auth_attempts, todos CASCADE");
        response.end("{}"); return;
      }
      if (request.url !== "/sql" || request.method !== "POST") {
        response.writeHead(404); response.end("{}"); return;
      }
      let body = "";
      for await (const chunk of request) body += chunk;
      const query = JSON.parse(body) as { query: string; params: unknown[] };
      const result = await client.query<unknown[]>(query.query, query.params, { rowMode: "array" });
      // Neon requests raw PostgreSQL text; its normal driver then decodes it.
      const rows = result.rows.map((row) => row.map((value) => {
        if (value === null) return null;
        if (typeof value === "boolean") return value ? "t" : "f";
        if (value instanceof Date) return value.toISOString();
        if (typeof value === "object") return JSON.stringify(value);
        return String(value);
      }));
      response.end(JSON.stringify({ fields: result.fields, rows, rowCount: result.affectedRows ?? rows.length, command: query.query.trim().split(/\s+/)[0] }));
    } catch (error) {
      response.writeHead(400);
      response.end(JSON.stringify({ message: error instanceof Error ? error.message : "Test database failure" }));
    }
  });
  server.listen(3199, "127.0.0.1");
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, () => server.close(() => { void client.close().then(() => process.exit(0)); }));
  }
}

void main();
