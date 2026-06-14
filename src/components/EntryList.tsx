"use client";

import Link from "next/link";
import type { VaultEntryDTO } from "@/lib/api";
import { ageLabel } from "@/lib/format";

export function EntryList({ entries }: { entries: VaultEntryDTO[] }) {
  if (entries.length === 0) {
    return (
      <div className="card text-center text-sm text-slate-600">
        Chưa có mục nào. Hãy thêm tài khoản đầu tiên của bạn.
      </div>
    );
  }

  return (
    <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
      {entries.map((e) => (
        <li key={e.id}>
          <Link href={`/entries/${e.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50">
            <div className="min-w-0">
              <p className="truncate font-medium text-slate-900">{e.label}</p>
              <p className="truncate text-sm text-slate-500">{e.username || e.url || "—"}</p>
            </div>
            <span className="shrink-0 text-xs text-slate-400">{ageLabel(e.lastChangedAt)}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
