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
    if (pw !== confirm) return setError("Hai lần nhập master password không khớp.");

    setBusy(true);
    try {
      const authSalt = generateSalt();
      const encSalt = generateSalt();
      const iterations = DEFAULT_KDF_ITERATIONS;
      const mail = email.trim().toLowerCase();

      // Derive locally — the master password never leaves this device.
      const [authHash, encKey] = await Promise.all([
        deriveAuthHash(pw, authSalt, iterations),
        deriveEncKey(pw, encSalt, iterations),
      ]);

      await apiSignup({
        email: mail,
        authSalt,
        encSalt,
        authHash,
        kdfIterations: iterations,
      });

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
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
        <h1 className="mb-1 text-2xl font-bold">Tạo kho thành công 🔐</h1>
        <p className="mb-6 text-sm text-[var(--text-muted)]">Thiết lập PIN để lần sau mở khóa nhanh hơn.</p>
        <PinSetupPrompt
          email={c.mail}
          deriveExtractableKey={() => deriveEncKey(c.pw, c.encSalt, c.iterations, true)}
          onDone={() => router.push("/dashboard")}
          onSkip={() => router.push("/dashboard")}
        />
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <h1 className="mb-1 text-2xl font-bold">Tạo kho mật khẩu 🔐</h1>
      <p className="mb-6 text-sm text-[var(--text-muted)]">
        Đặt một <strong>master password</strong> — đây là chìa khóa giải mã toàn bộ kho.
      </p>

      <form onSubmit={onSubmit} className="card space-y-4">
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" type="email" required className="input" value={email}
            onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
        </div>
        <div>
          <label className="label" htmlFor="pw">Master password</label>
          <input id="pw" type="password" required className="input" value={pw}
            onChange={(e) => setPw(e.target.value)} autoComplete="new-password" />
        </div>
        <div>
          <label className="label" htmlFor="confirm">Nhập lại master password</label>
          <input id="confirm" type="password" required className="input" value={confirm}
            onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
        </div>

        <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
          ⚠️ <strong>Quan trọng:</strong> Master password không được lưu ở đâu cả. Nếu bạn quên nó,
          toàn bộ kho sẽ <strong>không thể khôi phục</strong>. Hãy ghi nhớ thật kỹ.
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button type="submit" className="btn-primary w-full" disabled={busy}>
          {busy ? "Đang tạo…" : "Tạo kho"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-[var(--text-muted)]">
        Đã có kho? <Link href="/unlock" className="font-medium text-brand">Mở khóa</Link>
      </p>
    </main>
  );
}
