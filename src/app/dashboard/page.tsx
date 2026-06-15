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

  const q = search.trim().toLowerCase();
  const filtered = q
    ? entries.filter((e) => [e.label, e.username, e.url].some((f) => f?.toLowerCase().includes(q)))
    : entries;

  return (
    <>
      <AppHeader dueCount={due.length} />
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">

        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight" style={{ color: "var(--text)" }}>
              Kho mật khẩu
            </h1>
            {!loading && (
              <p className="mt-0.5 text-sm" style={{ color: "var(--text-muted)" }}>
                {entries.length} mục
              </p>
            )}
          </div>
          <Link href="/entries/new" className="btn-primary px-4 py-2">
            + Thêm mục
          </Link>
        </div>

        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
            {error}
          </p>
        )}

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-2xl"
                style={{ background: "var(--surface-muted)" }}
              />
            ))}
          </div>
        ) : (
          <>
            <DueReminders items={due} onChanged={load} />

            <section className="space-y-3">
              {entries.length > 0 && (
                <input
                  type="search"
                  className="input"
                  placeholder="Tìm kiếm tên, email, địa chỉ web…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              )}
              <EntryList entries={entries} filtered={filtered} search={search} />
            </section>

            <PinManager />
          </>
        )}
      </main>
    </>
  );
}
