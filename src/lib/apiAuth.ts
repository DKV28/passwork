import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/session";

/**
 * Resolve the authenticated user id for an API route, or return a 401 response.
 * Usage:
 *   const auth = await requireUser();
 *   if (auth instanceof NextResponse) return auth;
 *   const userId = auth.userId;
 */
export async function requireUser(): Promise<{ userId: string } | NextResponse> {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  return { userId };
}
