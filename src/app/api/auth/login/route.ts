import { NextResponse } from "next/server";
import argon2 from "argon2";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/session";

/**
 * Verify the client-derived auth verifier (authHash) against the stored
 * argon2id hash and, on success, issue a session cookie. The encryption key is
 * derived independently in the browser and never touches the server.
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

  const user = await prisma.user.findUnique({ where: { email } });
  // Compare even when the user is missing would be ideal, but argon2.verify
  // needs a stored hash; a generic error message avoids leaking specifics.
  const valid = user ? await argon2.verify(user.serverHash, authHash) : false;
  if (!user || !valid) {
    return NextResponse.json({ error: "Incorrect email or master password" }, { status: 401 });
  }

  await createSession(user.id);
  return NextResponse.json({ ok: true });
}
