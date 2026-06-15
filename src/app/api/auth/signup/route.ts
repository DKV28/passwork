import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/session";
import { hashVerifier } from "@/lib/verifier";

/**
 * Create an account. The browser has already generated the salts and derived
 * the auth verifier (authHash) locally; we only ever receive those values,
 * never the master password itself.
 */
export async function POST(request: Request) {
  let body: {
    email?: string;
    authSalt?: string;
    encSalt?: string;
    authHash?: string;
    kdfIterations?: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const { authSalt, encSalt, authHash, kdfIterations } = body;

  if (!email || !authSalt || !encSalt || !authHash || !kdfIterations) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }

    const serverHash = hashVerifier(authHash);

    const user = await prisma.user.create({
      data: { email, authSalt, encSalt, serverHash, kdfIterations },
    });

    await createSession(user.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[signup] failed:", err);
    return NextResponse.json(
      { error: "Server error. Kiểm tra cấu hình database (Turso) và đã áp schema chưa." },
      { status: 500 },
    );
  }
}
