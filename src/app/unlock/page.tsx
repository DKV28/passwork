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
      await apiLogin({ email: mail, authHash });
      unlock(encKey, mail);
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
      <AuthShell title="Thiết lập PIN" subtitle="Mở khóa nhanh hơn ở lần sau mà không cần nhập lại mật khẩu.">
        <PinSetupPrompt
          email={c.mail}
          deriveExtractableKey={() => deriveEncKey(c.pw, c.encSalt, c.iterations, true)}
          onDone={() => router.push(next)}
          onSkip={() => router.push(next)}
        />
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Mở khóa kho" subtitle="Nhập master password để giải mã kho mật khẩu của bạn.">
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" type="email" required className="input" value={email}
            onChange={(e) => setEmail(e.target.value)} autoComplete="username"
            placeholder="you@example.com" />
        </div>
        <div>
          <label className="label" htmlFor="pw">Master password</label>
          <input id="pw" type="password" required className="input" value={pw}
            onChange={(e) => setPw(e.target.value)} autoComplete="current-password"
            placeholder="••••••••••••" />
        </div>

        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
            {error}
          </p>
        )}

        <button type="submit" className="btn-primary w-full py-2.5" disabled={busy}>
          {busy ? "Đang mở khóa…" : "Mở khóa"}
        </button>
      </form>

      <p className="mt-5 text-center text-sm" style={{ color: "var(--text-muted)" }}>
        Chưa có kho?{" "}
        <Link href="/signup" className="font-semibold" style={{ color: "var(--brand)" }}>
          Tạo kho mới
        </Link>
      </p>
    </AuthShell>
  );
}

function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="mb-8 text-center">
        <div
          className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl text-lg font-bold text-white"
          style={{ background: "var(--brand)", boxShadow: "0 4px 14px color-mix(in srgb, var(--brand) 40%, transparent)" }}
        >
          P
        </div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text)" }}>{title}</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>{subtitle}</p>
      </div>
      <div className="w-full max-w-sm">
        <div className="card">{children}</div>
      </div>
    </div>
  );
}

export default function UnlockPage() {
  return (
    <Suspense fallback={null}>
      <UnlockForm />
    </Suspense>
  );
}
