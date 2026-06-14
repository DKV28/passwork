"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useVault } from "@/components/VaultProvider";
import { apiLogout } from "@/lib/api";

export function AppHeader({ dueCount }: { dueCount?: number }) {
  const router = useRouter();
  const { email, lock } = useVault();

  async function onLock() {
    lock();
    await apiLogout().catch(() => {});
    router.push("/unlock");
  }

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold">
          <span>🔐 Passwork</span>
          {dueCount ? (
            <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs font-semibold text-white">
              {dueCount} cần xem
            </span>
          ) : null}
        </Link>
        <div className="flex items-center gap-3 text-sm">
          {email && <span className="hidden text-slate-500 sm:inline">{email}</span>}
          <button onClick={onLock} className="btn-secondary">Khóa</button>
        </div>
      </div>
    </header>
  );
}
