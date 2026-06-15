import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";

// Connect via the libSQL driver adapter so the same code runs on Turso
// (serverless-friendly, used in production) and on a local SQLite file (dev).
//   - Production: set TURSO_DATABASE_URL (libsql://…) and TURSO_AUTH_TOKEN.
//   - Local dev:  falls back to the SQLite file used by the Prisma CLI.
const url = process.env.TURSO_DATABASE_URL ?? "file:./prisma/dev.db";
const authToken = process.env.TURSO_AUTH_TOKEN;

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient(): PrismaClient {
  const adapter = new PrismaLibSQL({ url, authToken });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
