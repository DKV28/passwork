import { describe, it, expect } from "vitest";
import {
  computeNextReminder,
  evaluateReminder,
  isDue,
  daysBetween,
  snoozeUntil,
  DAY_MS,
  STALE_AFTER_DAYS,
  SNOOZE_DAYS,
  type ReminderInput,
} from "./reminders";

const now = new Date("2026-06-14T00:00:00Z");
const daysAgo = (n: number) => new Date(now.getTime() - n * DAY_MS);
const daysAhead = (n: number) => new Date(now.getTime() + n * DAY_MS);

function entry(overrides: Partial<ReminderInput> = {}): ReminderInput {
  return {
    lastChangedAt: now,
    rotationDays: null,
    nextReminderAt: null,
    reminderDismissedAt: null,
    ...overrides,
  };
}

describe("computeNextReminder", () => {
  it("returns null when rotation is disabled", () => {
    expect(computeNextReminder(now, null)).toBeNull();
    expect(computeNextReminder(now, 0)).toBeNull();
  });

  it("adds rotationDays to lastChangedAt", () => {
    const next = computeNextReminder(now, 90);
    expect(next).not.toBeNull();
    expect(daysBetween(next!, now)).toBe(90);
  });
});

describe("rotation reminders", () => {
  it("is not due before the rotation window elapses", () => {
    const e = entry({ lastChangedAt: daysAgo(30), rotationDays: 90 });
    expect(evaluateReminder(e, now)).toBeNull();
  });

  it("is due once the rotation window elapses", () => {
    const e = entry({ lastChangedAt: daysAgo(100), rotationDays: 90 });
    expect(evaluateReminder(e, now)).toBe("rotation");
  });

  it("respects a precomputed nextReminderAt", () => {
    const e = entry({ lastChangedAt: daysAgo(200), rotationDays: 90, nextReminderAt: daysAgo(1) });
    expect(evaluateReminder(e, now)).toBe("rotation");
  });
});

describe("snoozing", () => {
  it("hides a due reminder until the snooze window passes", () => {
    const e = entry({
      lastChangedAt: daysAgo(100),
      rotationDays: 90,
      reminderDismissedAt: daysAhead(10), // snoozed into the future
    });
    expect(isDue(e, now)).toBe(false);
  });

  it("re-surfaces once the snooze window has passed", () => {
    const e = entry({
      lastChangedAt: daysAgo(100),
      rotationDays: 90,
      reminderDismissedAt: daysAgo(1), // snooze already expired
    });
    expect(evaluateReminder(e, now)).toBe("rotation");
  });

  it("snoozeUntil returns a timestamp SNOOZE_DAYS ahead", () => {
    expect(daysBetween(snoozeUntil(now), now)).toBe(SNOOZE_DAYS);
  });
});

describe("staleness reminders", () => {
  it("nudges when an unrotated password is very old", () => {
    const e = entry({ lastChangedAt: daysAgo(STALE_AFTER_DAYS + 1) });
    expect(evaluateReminder(e, now)).toBe("stale");
  });

  it("does not nudge a recently changed password", () => {
    const e = entry({ lastChangedAt: daysAgo(10) });
    expect(evaluateReminder(e, now)).toBeNull();
  });

  it("is hidden while a stale nudge is snoozed", () => {
    const e = entry({
      lastChangedAt: daysAgo(STALE_AFTER_DAYS + 5),
      reminderDismissedAt: daysAhead(SNOOZE_DAYS),
    });
    expect(isDue(e, now)).toBe(false);
  });
});
