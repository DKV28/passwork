"use client";

import { useState } from "react";
import { setupPin, MIN_PIN_LEN } from "@/lib/pin";

/**
 * Inline PIN setup card. The parent supplies `deriveExtractableKey`, a closure
 * that derives a throwaway EXTRACTABLE copy of the encryption key (the master
 * password is still in the parent's scope). That copy is wrapped by the PIN and
 * then discarded — the long-lived session key stays non-extractable.
 */
export function PinSetupPrompt({
  email,
  deriveExtractableKey,
  onDone,
  onSkip,
}: {
  email: string;
  deriveExtractableKey: () => Promise<CryptoKey>;
  onDone: () => void;
  onSkip: () => void;
}) {
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (pin.length < MIN_PIN_LEN) return setError(`PIN phải có ít nhất ${MIN_PIN_LEN} chữ số.`);
    if (pin !== confirm) return setError("Hai lần nhập PIN không khớp.");

    setBusy(true);
    try {
      const key = await deriveExtractableKey();
      await setupPin(pin, key, email);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thiết lập được PIN.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSave} className="card space-y-4">
      <div>
        <h2 className="font-semibold">Thiết lập mã PIN</h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Lần sau quay lại trên thiết bị này, bạn chỉ cần nhập PIN thay vì master password.
        </p>
      </div>
      <div>
        <label className="label" htmlFor="pin">Mã PIN (ít nhất {MIN_PIN_LEN} chữ số)</label>
        <input
          id="pin"
          type="password"
          inputMode="numeric"
          autoComplete="off"
          className="input"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 12))}
        />
      </div>
      <div>
        <label className="label" htmlFor="pin-confirm">Nhập lại PIN</label>
        <input
          id="pin-confirm"
          type="password"
          inputMode="numeric"
          autoComplete="off"
          className="input"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value.replace(/\D/g, "").slice(0, 12))}
        />
      </div>

      <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
        Lưu ý: PIN chỉ giúp mở khóa nhanh trên máy này. Nó <strong>không</strong> bảo vệ được nếu
        thiết bị bị nhiễm mã độc hoặc bị sao chép dữ liệu. Khi dùng máy lạ, hãy bấm “Đăng xuất”.
      </p>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? "Đang lưu…" : "Lưu PIN"}
        </button>
        <button type="button" className="btn-secondary" onClick={onSkip} disabled={busy}>
          Bỏ qua
        </button>
      </div>
    </form>
  );
}
