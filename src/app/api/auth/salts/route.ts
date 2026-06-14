import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * Return the salts + KDF cost for an email so the browser can derive its keys
 * before logging in. (For a personal single-user tool we accept that this
 * reveals whether an email is registered.)
 */
export async function POST(request: Request) {
  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { authSalt: true, encSalt: true, kdfIterations: true },
  });
  if (!user) {
    return NextResponse.json({ error: "No account found for this email" }, { status: 404 });
  }

  return NextResponse.json(user);
}
