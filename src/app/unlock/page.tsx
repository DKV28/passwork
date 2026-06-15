"use client";

import { Suspense, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useVault } from "@/components/VaultProvider";
import { PinSetupPrompt } from "@/components/PinSetupPrompt";
import { deriveEncKey, deriveAuthHash } from "@/lib/crypto";
import { hasPinSetup } from "@/lib/pin";
import { apiGetSalts, apiLogin } from "@/lib/api";

function UnlockForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/dashboard";
  const { unlock } = useVault();

  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offerPin, setOfferPin] = useState(false);

  // Held so the PIN setup step can derive a throwaway extractable key from the
  // same master password without re-prompting.
  const creds = useRef<{ mail: string; pw: string; encSalt: string; iterations: number } | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const mail = email.trim().toLowerCase();
    try {
      const { authSalt, encSalt, kdfIterations } = await apiGetSalts(mail);

      const [authHash, encKey] = await Promise.all([
        deriveAuthHash(pw, authSalt, kdfIterations),
        deriveEncKey(pw, encSalt, kdfIterations),
      ]);

      // The server verifies the auth hash; the encKey stays only in memory here.
      await apiLogin({ email: mail, authHash });

      unlock(encKey, mail);

      // Offer PIN setup once, only if the user hasn't already set one up.
      if (!hasPinSetup()) {
        creds.current = { mail, pw, encSalt, iterations: kdfIterations };
        setOfferPin(true);
        setBusy(false);
        return;
      }
      router.push(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mở khóa thất bại.");
      setBusy(false);
    }
  }

  if (offerPin && creds.current) {
    const c = creds.current;
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
        <h1 className="mb-1 text-2xl font-bold">Đăng nhập thành công 🔓</h1>
        <p className="mb-6 text-sm text-[var(--text-muted)]">Thiết lập PIN để lần sau mở khóa nhanh hơn.</p>
        <PinSetupPrompt
          email={c.mail}
          deriveExtractableKey={() => deriveEncKey(c.pw, c.encSalt, c.iterations, true)}
          onDone={() => router.push(next)}
          onSkip={() => router.push(next)}
        />
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <h1 className="mb-1 text-2xl font-bold">Mở khóa kho 🔓</h1>
      <p className="mb-6 text-sm text-[var(--text-muted)]">Nhập master password để giải mã kho mật khẩu của bạn.</p>

      <form onSubmit={onSubmit} className="card space-y-4">
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" type="email" required className="input" value={email}
            onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
        </div>
        <div>
          <label className="label" htmlFor="pw">Master password</label>
          <input id="pw" type="password" required className="input" value={pw}
            onChange={(e) => setPw(e.target.value)} autoComplete="current-password" />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button type="submit" className="btn-primary w-full" disabled={busy}>
          {busy ? "Đang mở khóa…" : "Mở khóa"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-[var(--text-muted)]">
        Chưa có kho? <Link href="/signup" className="font-medium text-brand">Tạo kho mới</Link>
      </p>
    </main>
  );
}

export default function UnlockPage() {
  return (
    <Suspense fallback={null}>
      <UnlockForm />
    </Suspense>
  );
}
