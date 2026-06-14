import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/apiAuth";
import { computeNextReminder, snoozeUntil } from "@/lib/reminders";

type Ctx = { params: Promise<{ id: string }> };

/** Fetch a single entry with its password history (all ciphertext). */
export async function GET(_request: Request, { params }: Ctx) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  const entry = await prisma.vaultEntry.findFirst({
    where: { id, userId: auth.userId },
    include: { history: { orderBy: { changedAt: "desc" } } },
  });
  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ entry });
}

/**
 * Update an entry. Supports three concerns in one call:
 *  - metadata edits (label, url, username, notes, rotationDays)
 *  - password rotation: when `password` is provided, the OLD password is
 *    archived into history, lastChangedAt is bumped and the reminder reset
 *  - reminder actions: `reminderAction` of "snooze" or "markCurrent"
 */
export async function PUT(request: Request, { params }: Ctx) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  let body: {
    label?: string;
    url?: string | null;
    username?: string | null;
    notesCipher?: string | null;
    notesIv?: string | null;
    rotationDays?: number | null;
    password?: { cipher: string; iv: string };
    reminderAction?: "snooze" | "markCurrent";
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const existing = await prisma.vaultEntry.findFirst({
    where: { id, userId: auth.userId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const now = new Date();
  const data: Record<string, unknown> = {};

  // Metadata
  if (body.label !== undefined) {
    const label = body.label.trim();
    if (!label) return NextResponse.json({ error: "Label cannot be empty" }, { status: 400 });
    data.label = label;
  }
  if (body.url !== undefined) data.url = body.url?.trim() || null;
  if (body.username !== undefined) data.username = body.username?.trim() || null;
  if (body.notesCipher !== undefined) data.notesCipher = body.notesCipher;
  if (body.notesIv !== undefined) data.notesIv = body.notesIv;

  // Determine the effective rotationDays (used to recompute reminders below).
  const rotationDays = body.rotationDays !== undefined ? body.rotationDays : existing.rotationDays;
  if (body.rotationDays !== undefined) data.rotationDays = body.rotationDays;

  // Password rotation: archive old, set new, reset the clock.
  const rotating = Boolean(body.password);
  if (rotating) {
    await prisma.passwordHistory.create({
      data: {
        entryId: existing.id,
        passwordCipher: existing.passwordCipher,
        passwordIv: existing.passwordIv,
        changedAt: now,
      },
    });
    data.passwordCipher = body.password!.cipher;
    data.passwordIv = body.password!.iv;
    data.lastChangedAt = now;
    data.nextReminderAt = computeNextReminder(now, rotationDays);
    data.reminderDismissedAt = null;
  }

  // Reminder actions
  if (body.reminderAction === "snooze") {
    data.reminderDismissedAt = snoozeUntil(now);
  } else if (body.reminderAction === "markCurrent") {
    // Reset the clock so the entry is no longer considered stale/due.
    data.lastChangedAt = now;
    data.nextReminderAt = computeNextReminder(now, rotationDays);
    data.reminderDismissedAt = null;
  } else if (body.rotationDays !== undefined && !rotating) {
    // Rotation interval changed without a password change: recompute from lastChangedAt.
    data.nextReminderAt = computeNextReminder(existing.lastChangedAt, rotationDays);
  }

  const entry = await prisma.vaultEntry.update({ where: { id: existing.id }, data });
  return NextResponse.json({ entry });
}

/** Delete an entry (and its history via cascade). */
export async function DELETE(_request: Request, { params }: Ctx) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  const existing = await prisma.vaultEntry.findFirst({
    where: { id, userId: auth.userId },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.vaultEntry.delete({ where: { id: existing.id } });
  return NextResponse.json({ ok: true });
}
