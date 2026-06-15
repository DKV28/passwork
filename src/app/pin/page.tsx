"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useVault } from "@/components/VaultProvider";
import {
  unlockWithPin,
  clearPin,
  getPinFailCount,
  hasPinSetup,
  MAX_FAILS,
  MIN_PIN_LEN,
} from "@/lib/pin";

function PinForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/dashboard";
  const { unlock } = useVault();

  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If there's no PIN on this device, fall back to the master-password unlock.
  useEffect(() => {
    if (!hasPinSetup()) router.replace(`/unlock?next=${encodeURIComponent(next)}`);
  }, [router, next]);

  const lockedOut = getPinFailCount() >= MAX_FAILS;

  async function submit(value: string) {
    if (busy || lockedOut) return;
    setBusy(true);
    setError(null);
    try {
      const { encKey, email } = await unlockWithPin(value);
      unlock(encKey, email);
      router.replace(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "PIN không đúng.");
      setPin("");
      setBusy(false);
    }
  }

  function onChange(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 12);
    setPin(digits);
    // Auto-submit once a plausible PIN length is reached.
    if (digits.length >= MIN_PIN_LEN) submit(digits);
  }

  function onForgot() {
    clearPin();
    router.replace(`/unlock?next=${encodeURIComponent(next)}`);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <h1 className="mb-1 text-2xl font-bold">Nhập mã PIN</h1>
      <p className="mb-6 text-sm text-[var(--text-muted)]">
        Nhập mã PIN để mở khóa kho trên thiết bị này.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(pin);
        }}
        className="card space-y-4"
      >
        <div>
          <label className="label" htmlFor="pin">Mã PIN</label>
          <input
            id="pin"
            type="password"
            inputMode="numeric"
            autoComplete="off"
            autoFocus
            className="input tracking-[0.5em] text-center text-lg"
            value={pin}
            disabled={busy || lockedOut}
            onChange={(e) => onChange(e.target.value)}
            placeholder="••••••"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button type="submit" className="btn-primary w-full" disabled={busy || lockedOut}>
          {busy ? "Đang mở khóa…" : "Mở khóa"}
        </button>
      </form>

      <button onClick={onForgot} className="mt-4 text-center text-sm text-brand">
        Quên PIN? Đăng nhập bằng master password
      </button>
    </main>
  );
}

export default function PinPage() {
  return (
    <Suspense fallback={null}>
      <PinForm />
    </Suspense>
  );
}
