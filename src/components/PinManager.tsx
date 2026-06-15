"use client";

import { useEffect, useState } from "react";
import { useVault } from "@/components/VaultProvider";
import { PinSetupPrompt } from "@/components/PinSetupPrompt";
import { deriveEncKey, deriveAuthHash } from "@/lib/crypto";
import { apiGetSalts, apiLogin } from "@/lib/api";
import { hasPinSetup, clearPin } from "@/lib/pin";

/**
 * "Bảo mật" card on the dashboard: enable or remove the PIN.
 *
 * The in-memory session key is non-extractable, so to set up a PIN here we must
 * re-derive an extractable copy — which needs the master password. We re-prompt
 * for it (and verify it via the login endpoint) before wrapping.
 */
export function PinManager() {
  const { email } = useVault();
  const [enabled, setEnabled] = useState(false);
  const [stage, setStage] = useState<"idle" | "password" | "pin">("idle");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [salts, setSalts] = useState<{ encSalt: string; iterations: number } | null>(null);

  // localStorage is client-only: read after mount to avoid hydration mismatch.
  useEffect(() => setEnabled(hasPinSetup()), []);

  async function verifyPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setError(null);
    setBusy(true);
    try {
      const { authSalt, encSalt, kdfIterations } = await apiGetSalts(email);
      const authHash = await deriveAuthHash(pw, authSalt, kdfIterations);
      await apiLogin({ email, authHash }); // throws on wrong password
      setSalts({ encSalt, iterations: kdfIterations });
      setStage("pin");
    } catch {
      setError("Master password không đúng.");
    } finally {
      setBusy(false);
    }
  }

  function remove() {
    clearPin();
    setEnabled(false);
    setStage("idle");
  }

  function reset() {
    setPw("");
    setSalts(null);
    setStage("idle");
    setError(null);
  }

  return (
    <section className="card space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">Bảo mật</h2>

      {enabled ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm">Mã PIN đang bật trên thiết bị này.</p>
          <button onClick={remove} className="btn-danger px-3 py-1.5 text-xs">Xóa PIN</button>
        </div>
      ) : stage === "idle" ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-[var(--text-muted)]">
            Thiết lập PIN để lần sau mở khóa nhanh, không cần master password.
          </p>
          <button onClick={() => setStage("password")} className="btn-secondary px-3 py-1.5 text-xs">
            Thiết lập PIN
          </button>
        </div>
      ) : stage === "password" ? (
        <form onSubmit={verifyPassword} className="space-y-3">
          <p className="text-sm text-[var(--text-muted)]">Xác nhận master password để bật PIN.</p>
          <input
            type="password"
            className="input"
            placeholder="Master password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            autoComplete="current-password"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" className="btn-primary px-3 py-1.5 text-sm" disabled={busy}>
              {busy ? "Đang kiểm tra…" : "Tiếp tục"}
            </button>
            <button type="button" onClick={reset} className="btn-secondary px-3 py-1.5 text-sm">Hủy</button>
          </div>
        </form>
      ) : salts && email ? (
        <PinSetupPrompt
          email={email}
          deriveExtractableKey={() => deriveEncKey(pw, salts.encSalt, salts.iterations, true)}
          onDone={() => {
            setEnabled(true);
            reset();
          }}
          onSkip={reset}
        />
      ) : null}
    </section>
  );
}
