"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { useUnlockGuard } from "@/components/useUnlockGuard";
import { useVault } from "@/components/VaultProvider";
import { decrypt } from "@/lib/crypto";
import { apiGetEntry } from "@/lib/api";
import { formatDate } from "@/lib/format";

interface HistoryRow {
  id: string;
  changedAt: string;
  password: string;
}

export default function HistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const unlocked = useUnlockGuard();
  const { encKey } = useVault();

  const [label, setLabel] = useState("");
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!encKey) return;
    try {
      const { entry } = await apiGetEntry(id);
      setLabel(entry.label);
      const decrypted = await Promise.all(
        entry.history.map(async (h) => ({
          id: h.id,
          changedAt: h.changedAt,
          password: await decrypt(h.passwordCipher, h.passwordIv, encKey),
        })),
      );
      setRows(decrypted);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được lịch sử.");
    } finally {
      setLoading(false);
    }
  }, [encKey, id]);

  useEffect(() => {
    if (unlocked) load();
  }, [unlocked, load]);

  if (!unlocked) return null;

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-xl px-4 py-6">
        <Link href={`/entries/${id}`} className="text-sm text-brand">← Quay lại</Link>
        <h1 className="mb-4 mt-2 text-xl font-bold">Lịch sử mật khẩu — {label}</h1>

        {loading ? (
          <p className="text-sm text-slate-500">Đang giải mã…</p>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : rows.length === 0 ? (
          <div className="card text-sm text-slate-600">
            Chưa có mật khẩu cũ nào. Khi bạn đổi mật khẩu, giá trị cũ sẽ xuất hiện ở đây.
          </div>
        ) : (
          <ul className="space-y-2">
            {rows.map((r) => (
              <li key={r.id} className="card flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-slate-500">Đổi ngày {formatDate(r.changedAt)}</p>
                  <p className="truncate font-mono text-sm">
                    {revealed[r.id] ? r.password : "••••••••••"}
                  </p>
                </div>
                <button className="btn-secondary shrink-0"
                  onClick={() => setRevealed((s) => ({ ...s, [r.id]: !s[r.id] }))}>
                  {revealed[r.id] ? "Ẩn" : "Hiện"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
