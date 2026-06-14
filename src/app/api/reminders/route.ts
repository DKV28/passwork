import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/apiAuth";
import { evaluateReminder } from "@/lib/reminders";

/**
 * Return the entries that are due for review (rotation due or stale). Computed
 * purely from non-secret date metadata, so the server can do this without any
 * access to plaintext.
 */
export async function GET() {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  const entries = await prisma.vaultEntry.findMany({
    where: { userId: auth.userId },
    select: {
      id: true,
      label: true,
      url: true,
      lastChangedAt: true,
      rotationDays: true,
      nextReminderAt: true,
      reminderDismissedAt: true,
    },
  });

  const now = new Date();
  const due = entries
    .map((e) => ({ entry: e, reason: evaluateReminder(e, now) }))
    .filter((x) => x.reason !== null)
    .map((x) => ({
      id: x.entry.id,
      label: x.entry.label,
      url: x.entry.url,
      lastChangedAt: x.entry.lastChangedAt,
      reason: x.reason,
    }));

  return NextResponse.json({ due, count: due.length });
}
