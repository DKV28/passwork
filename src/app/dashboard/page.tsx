"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { DueReminders } from "@/components/DueReminders";
import { EntryList } from "@/components/EntryList";
import { PinManager } from "@/components/PinManager";
import { useUnlockGuard } from "@/components/useUnlockGuard";
import {
  apiListEntries,
  apiGetReminders,
  type VaultEntryDTO,
  type DueItemDTO,
} from "@/lib/api";

export default function DashboardPage() {
  const unlocked = useUnlockGuard();
  const [entries, setEntries] = useState<VaultEntryDTO[]>([]);
  const [due, setDue] = useState<DueItemDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    try {
      const [list, reminders] = await Promise.all([apiListEntries(), apiGetReminders()]);
      setEntries(list.entries);
      setDue(reminders.due);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được dữ liệu.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (unlocked) load();
  }, [unlocked, load]);

  if (!unlocked) return null;

  return (
    <>
      <AppHeader dueCount={due.length} />
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Kho mật khẩu</h1>
          <Link href="/entries/new" className="btn-primary">+ Thêm mục</Link>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {loading ? (
          <p className="text-sm text-[var(--text-muted)]">Đang tải…</p>
        ) : (
          <>
            <DueReminders items={due} onChanged={load} />
            <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  Tất cả ({entries.length})
                </h2>
                {entries.length > 0 && (
                  <input
                    type="search"
                    className="input max-w-[16rem]"
                    placeholder="Tìm kiếm…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                )}
              </div>
              <EntryList entries={entries} search={search} />
            </section>
            <PinManager />
          </>
        )}
      </main>
    </>
  );
}
