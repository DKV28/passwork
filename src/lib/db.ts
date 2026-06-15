import { PrismaClient } from "@prisma/client";

// Connects to Postgres (Supabase) via DATABASE_URL. On Vercel use the Supabase
// "Transaction pooler" connection string (port 6543, with ?pgbouncer=true) so
// serverless functions don't exhaust database connections.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
