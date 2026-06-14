"use client";

import Link from "next/link";
import { useState } from "react";
import type { DueItemDTO } from "@/lib/api";
import { apiUpdateEntry } from "@/lib/api";
import { reasonLabel } from "@/lib/format";

/**
 * Dashboard section listing entries due for review. Solves the "I forgot to
 * update the password" problem by nudging the user, with quick actions to act
 * on each item right away.
 */
export function DueReminders({
  items,
  onChanged,
}: {
  items: DueItemDTO[];
  onChanged: () => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);

  async function act(id: string, action: "snooze" | "markCurrent") {
    setBusyId(id);
    try {
      await apiUpdateEntry(id, { reminderAction: action });
      onChanged();
    } finally {
      setBusyId(null);
    }
  }

  if (items.length === 0) {
    return (
      <div className="card border-green-200 bg-green-50 text-sm text-green-800">
        ✅ Mọi mật khẩu đều ổn — không có mục nào cần xem lại.
      </div>
    );
  }

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Cần xem lại</h2>
      {items.map((item) => (
        <div key={item.id} className="card border-amber-200 bg-amber-50">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <Link href={`/entries/${item.id}`} className="font-semibold text-slate-900 hover:underline">
                {item.label}
              </Link>
              <p className="text-sm text-amber-800">{reasonLabel[item.reason]}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href={`/entries/${item.id}`} className="btn-primary">Cập nhật mật khẩu</Link>
              <button className="btn-secondary" disabled={busyId === item.id}
                onClick={() => act(item.id, "snooze")}>Hoãn 30 ngày</button>
              <button className="btn-secondary" disabled={busyId === item.id}
                onClick={() => act(item.id, "markCurrent")}>Còn đúng</button>
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}
