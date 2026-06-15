"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useVault } from "@/components/VaultProvider";
import { PinSetupPrompt } from "@/components/PinSetupPrompt";
import {
  generateSalt,
  deriveEncKey,
  deriveAuthHash,
  DEFAULT_KDF_ITERATIONS,
} from "@/lib/crypto";
import { apiSignup } from "@/lib/api";

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

export default function SignupPage() {
  const router = useRouter();
  const { unlock } = useVault();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offerPin, setOfferPin] = useState(false);

  const creds = useRef<{ mail: string; pw: string; encSalt: string; iterations: number } | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (pw.length < 8) return setError("Master password nên có ít nhất 8 ký tự.");
    if (pw !== confirm) return setError("Hai lần nhập không khớp.");

    setBusy(true);
    try {
      const authSalt = generateSalt();
      const encSalt = generateSalt();
      const iterations = DEFAULT_KDF_ITERATIONS;
      const mail = email.trim().toLowerCase();

      const [authHash, encKey] = await Promise.all([
        deriveAuthHash(pw, authSalt, iterations),
        deriveEncKey(pw, encSalt, iterations),
      ]);

      await apiSignup({ email: mail, authSalt, encSalt, authHash, kdfIterations: iterations });
      unlock(encKey, mail);
      creds.current = { mail, pw, encSalt, iterations };
      setOfferPin(true);
      setBusy(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đăng ký thất bại.");
      setBusy(false);
    }
  }

  if (offerPin && creds.current) {
    const c = creds.current;
    return (
      <AuthShell title="Kho đã tạo!" subtitle="Thiết lập PIN để mở khóa nhanh hơn ở lần sau.">
        <PinSetupPrompt
          email={c.mail}
          deriveExtractableKey={() => deriveEncKey(c.pw, c.encSalt, c.iterations, true)}
          onDone={() => router.push("/dashboard")}
          onSkip={() => router.push("/dashboard")}
        />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Tạo kho mật khẩu"
      subtitle="Master password là chìa khóa duy nhất giải mã kho của bạn."
    >
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
            onChange={(e) => setPw(e.target.value)} autoComplete="new-password"
            placeholder="••••••••••••" />
        </div>
        <div>
          <label className="label" htmlFor="confirm">Nhập lại</label>
          <input id="confirm" type="password" required className="input" value={confirm}
            onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password"
            placeholder="••••••••••••" />
        </div>

        <div
          className="rounded-xl border px-3.5 py-3 text-xs leading-relaxed"
          style={{ borderColor: "var(--border)", background: "var(--surface-muted)", color: "var(--text-muted)" }}
        >
          Nếu quên master password, kho sẽ <strong style={{ color: "var(--text)" }}>không thể khôi phục</strong>. Hãy ghi nhớ thật kỹ.
        </div>

        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
            {error}
          </p>
        )}

        <button type="submit" className="btn-primary w-full py-2.5" disabled={busy}>
          {busy ? "Đang tạo…" : "Tạo kho"}
        </button>
      </form>

      <p className="mt-5 text-center text-sm" style={{ color: "var(--text-muted)" }}>
        Đã có kho?{" "}
        <Link href="/unlock" className="font-semibold" style={{ color: "var(--brand)" }}>
          Mở khóa
        </Link>
      </p>
    </AuthShell>
  );
}
