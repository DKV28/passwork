"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { PasswordField } from "@/components/PasswordField";
import { useUnlockGuard } from "@/components/useUnlockGuard";
import { useVault } from "@/components/VaultProvider";
import { encrypt } from "@/lib/crypto";
import { apiCreateEntry } from "@/lib/api";
import { DEFAULT_ROTATION_DAYS } from "@/lib/reminders";

export default function NewEntryPage() {
  const unlocked = useUnlockGuard();
  const router = useRouter();
  const { encKey } = useVault();

  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [notes, setNotes] = useState("");
  const [rotationOn, setRotationOn] = useState(true);
  const [rotationDays, setRotationDays] = useState(DEFAULT_ROTATION_DAYS);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!encKey) return;
    setError(null);
    if (!label.trim() || !password) return setError("Cần có tên mục và mật khẩu.");

    setBusy(true);
    try {
      const pw = await encrypt(password, encKey);
      const notesEnc = notes.trim() ? await encrypt(notes, encKey) : null;

      await apiCreateEntry({
        label: label.trim(),
        url: url.trim() || null,
        username: username.trim() || null,
        passwordCipher: pw.cipher,
        passwordIv: pw.iv,
        notesCipher: notesEnc?.cipher ?? null,
        notesIv: notesEnc?.iv ?? null,
        rotationDays: rotationOn ? rotationDays : null,
      });
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lưu thất bại.");
      setBusy(false);
    }
  }

  if (!unlocked) return null;

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-xl px-4 py-6">
        <Link href="/dashboard" className="text-sm text-brand">← Quay lại</Link>
        <h1 className="mb-4 mt-2 text-xl font-bold">Thêm mục mới</h1>

        <form onSubmit={onSubmit} className="card space-y-4">
          <div>
            <label className="label" htmlFor="label">Tên mục *</label>
            <input id="label" required className="input" value={label}
              onChange={(e) => setLabel(e.target.value)} placeholder="VD: Gmail" />
          </div>
          <div>
            <label className="label" htmlFor="url">Địa chỉ web</label>
            <input id="url" className="input" value={url}
              onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
          </div>
          <div>
            <label className="label" htmlFor="username">Tên đăng nhập</label>
            <input id="username" className="input" value={username}
              onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
          </div>
          <div>
            <label className="label" htmlFor="password">Mật khẩu *</label>
            <PasswordField id="password" value={password} onChange={setPassword} />
          </div>
          <div>
            <label className="label" htmlFor="notes">Ghi chú (sẽ được mã hóa)</label>
            <textarea id="notes" className="input" rows={2} value={notes}
              onChange={(e) => setNotes(e.target.value)} />
          </div>

          <div className="rounded-lg bg-[var(--surface-muted)] p-3">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" checked={rotationOn}
                onChange={(e) => setRotationOn(e.target.checked)} />
              Nhắc tôi đổi mật khẩu định kỳ
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

          <div className="flex gap-2">
            <button type="submit" className="btn-primary" disabled={busy}>
              {busy ? "Đang lưu…" : "Lưu mục"}
            </button>
            <Link href="/dashboard" className="btn-secondary">Hủy</Link>
          </div>
        </form>
      </main>
    </>
  );
}
