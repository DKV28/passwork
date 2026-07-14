import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * Keep-alive endpoint hit by a Vercel Cron job (see vercel.json). Supabase's
 * free tier pauses a project after ~7 days without database activity, which
 * takes the app offline until manually resumed. Running a trivial query on a
 * schedule keeps the database "active" so it never auto-pauses.
 *
 * The query touches the database but returns no user data. When CRON_SECRET is
 * configured, we require it in the Authorization header so the endpoint can't
 * be abused as a free way to spin up the DB from outside.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const header = request.headers.get("authorization");
    if (header !== `Bearer ${secret}`) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
  }

  try {
    // Cheapest possible query that still forces a real round-trip to Postgres.
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, at: new Date().toISOString() });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "keepalive failed" },
      { status: 500 },
    );
  }
}
