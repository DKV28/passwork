"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
    if (digits.length >= MIN_PIN_LEN) submit(digits);
  }

  function onForgot() {
    clearPin();
    router.replace(`/unlock?next=${encodeURIComponent(next)}`);
  }

  const failCount = getPinFailCount();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="mb-8 text-center">
        <div
          className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl text-lg font-bold text-white"
          style={{ background: "var(--brand)", boxShadow: "0 4px 14px color-mix(in srgb, var(--brand) 40%, transparent)" }}
        >
          P
        </div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text)" }}>
          Nhập mã PIN
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
          Nhập PIN để mở khóa kho trên thiết bị này.
        </p>
      </div>

      <div className="w-full max-w-xs">
        <div className="card">
          <form
            onSubmit={(e) => { e.preventDefault(); submit(pin); }}
            className="space-y-4"
          >
            <div>
              <label className="label" htmlFor="pin">Mã PIN</label>
              <input
                id="pin"
                type="password"
                inputMode="numeric"
                autoComplete="off"
                autoFocus
                className="input text-center text-xl tracking-[0.6em]"
                value={pin}
                disabled={busy || lockedOut}
                onChange={(e) => onChange(e.target.value)}
                placeholder="••••••"
              />
            </div>

            {lockedOut ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
                PIN đã bị khóa sau {MAX_FAILS} lần sai. Hãy đăng nhập bằng master password.
              </div>
            ) : error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
                {error}
                {failCount > 0 && !lockedOut && (
                  <span className="block mt-0.5 text-xs opacity-70">
                    Còn {MAX_FAILS - failCount} lần thử.
                  </span>
                )}
              </div>
            ) : null}

            <button type="submit" className="btn-primary w-full py-2.5" disabled={busy || lockedOut}>
              {busy ? "Đang mở khóa…" : "Mở khóa"}
            </button>
          </form>
        </div>

        <button
          onClick={onForgot}
          className="mt-4 w-full text-center text-sm"
          style={{ color: "var(--text-muted)" }}
        >
          Quên PIN?{" "}
          <span style={{ color: "var(--brand)" }} className="font-semibold">
            Đăng nhập bằng master password
          </span>
        </button>
      </div>
    </div>
  );
}

export default function PinPage() {
  return (
    <Suspense fallback={null}>
      <PinForm />
    </Suspense>
  );
}
