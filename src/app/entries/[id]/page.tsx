"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { PasswordField } from "@/components/PasswordField";
import { useUnlockGuard } from "@/components/useUnlockGuard";
import { useVault } from "@/components/VaultProvider";
import { encrypt, decrypt } from "@/lib/crypto";
import { apiGetEntry, apiUpdateEntry, apiDeleteEntry, type VaultEntryDTO } from "@/lib/api";
import { ageLabel, formatDate } from "@/lib/format";

export default function EntryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const unlocked = useUnlockGuard();
  const router = useRouter();
  const { encKey } = useVault();

  const [entry, setEntry] = useState<VaultEntryDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Editable fields
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [originalPassword, setOriginalPassword] = useState("");
  const [notes, setNotes] = useState("");
  const [originalNotes, setOriginalNotes] = useState("");
  const [rotationOn, setRotationOn] = useState(false);
  const [rotationDays, setRotationDays] = useState(90);

  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    if (!encKey) return;
    try {
      const { entry } = await apiGetEntry(id);
      setEntry(entry);
      setLabel(entry.label);
      setUrl(entry.url ?? "");
      setUsername(entry.username ?? "");
      setRotationOn(Boolean(entry.rotationDays));
      setRotationDays(entry.rotationDays ?? 90);

      const pw = await decrypt(entry.passwordCipher, entry.passwordIv, encKey);
      setPassword(pw);
      setOriginalPassword(pw);

      if (entry.notesCipher && entry.notesIv) {
        const n = await decrypt(entry.notesCipher, entry.notesIv, encKey);
        setNotes(n);
        setOriginalNotes(n);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không mở được mục (sai khóa?).");
    } finally {
      setLoading(false);
    }
  }, [encKey, id]);

  useEffect(() => {
    if (unlocked) load();
  }, [unlocked, load]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!encKey || !entry) return;
    setError(null);
    setSaved(false);
    setBusy(true);
    try {
      const body: Record<string, unknown> = {
        label: label.trim(),
        url: url.trim() || null,
        username: username.trim() || null,
        rotationDays: rotationOn ? rotationDays : null,
      };

      // Password rotation: only when the value actually changed.
      if (password !== originalPassword) {
        const pw = await encrypt(password, encKey);
        body.password = { cipher: pw.cipher, iv: pw.iv };
      }

      // Notes change (re-encrypt).
      if (notes !== originalNotes) {
        if (notes.trim()) {
          const n = await encrypt(notes, encKey);
          body.notesCipher = n.cipher;
          body.notesIv = n.iv;
        } else {
          body.notesCipher = null;
          body.notesIv = null;
        }
      }

      await apiUpdateEntry(id, body);
      setSaved(true);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lưu thất bại.");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!confirm("Xóa mục này? Lịch sử mật khẩu cũng sẽ bị xóa.")) return;
    setBusy(true);
    try {
      await apiDeleteEntry(id);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xóa thất bại.");
      setBusy(false);
    }
  }

  if (!unlocked) return null;

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-xl px-4 py-6">
        <Link href="/dashboard" className="text-sm text-brand">← Quay lại</Link>

        {loading ? (
          <p className="mt-4 text-sm text-[var(--text-muted)]">Đang giải mã…</p>
        ) : error && !entry ? (
          <p className="mt-4 text-sm text-red-600">{error}</p>
        ) : entry ? (
          <>
            <div className="mb-4 mt-2 flex items-center justify-between">
              <h1 className="text-xl font-bold">{entry.label}</h1>
              <span className="text-xs text-slate-400">{ageLabel(entry.lastChangedAt)}</span>
            </div>

            <form onSubmit={onSave} className="card space-y-4">
              <div>
                <label className="label" htmlFor="label">Tên mục *</label>
                <input id="label" required className="input" value={label}
                  onChange={(e) => setLabel(e.target.value)} />
              </div>
              <div>
                <label className="label" htmlFor="url">Địa chỉ web</label>
                <input id="url" className="input" value={url} onChange={(e) => setUrl(e.target.value)} />
              </div>
              <div>
                <label className="label" htmlFor="username">Tên đăng nhập</label>
                <input id="username" className="input" value={username}
                  onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
              </div>
              <div>
                <label className="label" htmlFor="password">Mật khẩu</label>
                <PasswordField id="password" value={password} onChange={setPassword} />
                {password !== originalPassword && (
                  <p className="mt-1 text-xs text-amber-600">
                    Mật khẩu mới — khi lưu, mật khẩu cũ sẽ được đưa vào lịch sử.
                  </p>
                )}
              </div>
              <div>
                <label className="label" htmlFor="notes">Ghi chú (mã hóa)</label>
                <textarea id="notes" className="input" rows={2} value={notes}
                  onChange={(e) => setNotes(e.target.value)} />
              </div>

              <div className="rounded-lg bg-[var(--surface-muted)] p-3">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input type="checkbox" checked={rotationOn}
                    onChange={(e) => setRotationOn(e.target.checked)} />
                  Nhắc đổi mật khẩu định kỳ
                </label>
                {rotationOn && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-[var(--text-muted)]">
                    <span>Mỗi</span>
                    <input type="number" min={1} className="input w-24" value={rotationDays}
                      onChange={(e) => setRotationDays(Number(e.target.value))} />
                    <span>ngày</span>
                  </div>
                )}
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}
              {saved && <p className="text-sm text-green-600">Đã lưu ✓</p>}

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex gap-2">
                  <button type="submit" className="btn-primary" disabled={busy}>
                    {busy ? "Đang lưu…" : "Lưu thay đổi"}
                  </button>
                  <Link href={`/entries/${id}/history`} className="btn-secondary">Lịch sử</Link>
                </div>
                <button type="button" className="btn-danger" onClick={onDelete} disabled={busy}>
                  Xóa
                </button>
              </div>
            </form>

            {entry.nextReminderAt && (
              <p className="mt-3 text-center text-xs text-slate-400">
                Lần nhắc tiếp theo: {formatDate(entry.nextReminderAt)}
              </p>
            )}
          </>
        ) : null}
      </main>
    </>
  );
}
