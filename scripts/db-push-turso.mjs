/**
 * Apply the Prisma schema to a Turso (libSQL) database in one command.
 *
 *   1. Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN (e.g. in .env).
 *   2. npm run db:deploy
 *
 * Generates SQL from prisma/schema.prisma (no migration files needed) and runs
 * it against Turso, tolerating "already exists" so it is safe to re-run.
 */
import { execSync } from "node:child_process";
import { createClient } from "@libsql/client";
import fs from "node:fs";

// Load .env if present (so the script works without extra tooling).
if (fs.existsSync(".env")) {
  for (const line of fs.readFileSync(".env", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"]*)"?\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
if (!url) {
  console.error("✗ TURSO_DATABASE_URL is not set. See .env.example.");
  process.exit(1);
}

console.log("→ Generating SQL from prisma/schema.prisma …");
const sql = execSync(
  "npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script",
  { encoding: "utf8" },
);

const statements = sql
  .split(";")
  .map((s) => s.trim())
  .filter((s) => s && !s.startsWith("--"));

const client = createClient({ url, authToken });
console.log(`→ Applying ${statements.length} statement(s) to Turso …`);

let applied = 0;
let skipped = 0;
for (const stmt of statements) {
  try {
    await client.execute(stmt);
    applied++;
  } catch (err) {
    if (/already exists/i.test(String(err))) {
      skipped++;
    } else {
      console.error("✗ Failed on statement:\n", stmt, "\n", err);
      process.exit(1);
    }
  }
}

console.log(`✓ Done. Applied ${applied}, skipped ${skipped} (already existed).`);
