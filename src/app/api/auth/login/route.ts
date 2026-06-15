import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/session";
import { verifyVerifier } from "@/lib/verifier";

/**
 * Verify the client-derived auth verifier (authHash) against the stored hash
 * and, on success, issue a session cookie. The encryption key is derived
 * independently in the browser and never touches the server.
 */
export async function POST(request: Request) {
  let body: { email?: string; authHash?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const { authHash } = body;
  if (!email || !authHash) {
    return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    // A generic error message avoids leaking whether the email exists.
    const valid = user ? verifyVerifier(authHash, user.serverHash) : false;
    if (!user || !valid) {
      return NextResponse.json({ error: "Incorrect email or master password" }, { status: 401 });
    }

    await createSession(user.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[login] failed:", err);
    return NextResponse.json({ error: "Server error. Vui lòng thử lại." }, { status: 500 });
  }
}
