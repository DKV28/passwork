/**
 * Reminder logic — pure date math, no secrets involved. Shared by the server
 * (when computing the dashboard "due" list) and the client (badges/labels).
 */

/** A password older than this (and with no rotation set) gets a soft "still current?" nudge. */
export const STALE_AFTER_DAYS = 365;

/** Default rotation interval suggested in the UI. */
export const DEFAULT_ROTATION_DAYS = 90;

/** How long the "snooze" action hides a reminder for. */
export const SNOOZE_DAYS = 30;

export const DAY_MS = 24 * 60 * 60 * 1000;

export type ReminderReason = "rotation" | "stale";

/** The subset of a VaultEntry needed to evaluate reminders. */
export interface ReminderInput {
  lastChangedAt: Date;
  rotationDays: number | null;
  nextReminderAt: Date | null;
  // Interpreted as "snoozed until this moment". A future value hides the reminder.
  reminderDismissedAt: Date | null;
}

/** Compute the next rotation reminder date, or null if rotation is disabled. */
export function computeNextReminder(lastChangedAt: Date, rotationDays: number | null): Date | null {
  if (!rotationDays || rotationDays <= 0) return null;
  return new Date(lastChangedAt.getTime() + rotationDays * DAY_MS);
}

/** Whole days between two dates (a - b), floored. */
export function daysBetween(a: Date, b: Date): number {
  return Math.floor((a.getTime() - b.getTime()) / DAY_MS);
}

/**
 * Decide whether an entry should be surfaced for review.
 *
 * - rotation: rotation is enabled and the next-reminder date has passed.
 * - stale: no rotation set but the password has not changed in a long time.
 *
 * A reminder is hidden while it is snoozed (reminderDismissedAt is in the future).
 */
export function evaluateReminder(entry: ReminderInput, now: Date = new Date()): ReminderReason | null {
  // Snoozed: hide regardless of reason until the snooze window passes.
  if (entry.reminderDismissedAt && now < entry.reminderDismissedAt) return null;

  if (entry.rotationDays && entry.rotationDays > 0) {
    const due = entry.nextReminderAt ?? computeNextReminder(entry.lastChangedAt, entry.rotationDays);
    return due && now >= due ? "rotation" : null;
  }

  // No rotation configured: nudge only on staleness.
  const staleThreshold = new Date(entry.lastChangedAt.getTime() + STALE_AFTER_DAYS * DAY_MS);
  return now >= staleThreshold ? "stale" : null;
}

export function isDue(entry: ReminderInput, now: Date = new Date()): boolean {
  return evaluateReminder(entry, now) !== null;
}

/** A snooze-until timestamp SNOOZE_DAYS in the future. */
export function snoozeUntil(now: Date = new Date()): Date {
  return new Date(now.getTime() + SNOOZE_DAYS * DAY_MS);
}
