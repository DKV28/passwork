import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/apiAuth";
import { computeNextReminder } from "@/lib/reminders";

/** List the current user's vault entries (ciphertext + metadata, no history). */
export async function GET() {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  const entries = await prisma.vaultEntry.findMany({
    where: { userId: auth.userId },
    orderBy: { label: "asc" },
  });
  return NextResponse.json({ entries });
}

/** Create a new vault entry. The password arrives already encrypted by the browser. */
export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  let body: {
    label?: string;
    url?: string;
    username?: string;
    passwordCipher?: string;
    passwordIv?: string;
    notesCipher?: string;
    notesIv?: string;
    rotationDays?: number | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const label = body.label?.trim();
  if (!label || !body.passwordCipher || !body.passwordIv) {
    return NextResponse.json({ error: "Label and password are required" }, { status: 400 });
  }

  const lastChangedAt = new Date();
  const rotationDays = body.rotationDays ?? null;

  let entry;
  try {
    entry = await prisma.vaultEntry.create({
      data: {
        userId: auth.userId,
        label,
        url: body.url?.trim() || null,
        username: body.username?.trim() || null,
        passwordCipher: body.passwordCipher,
        passwordIv: body.passwordIv,
        notesCipher: body.notesCipher ?? null,
        notesIv: body.notesIv ?? null,
        lastChangedAt,
        rotationDays,
        nextReminderAt: computeNextReminder(lastChangedAt, rotationDays),
      },
    });
  } catch (err) {
    console.error("[POST /api/entries]", err);
    const message = err instanceof Error ? err.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ entry });
}
