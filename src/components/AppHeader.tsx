"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useVault } from "@/components/VaultProvider";
import { useTheme } from "@/components/ThemeProvider";
import { apiLogout } from "@/lib/api";
import { hasPinSetup } from "@/lib/pin";

export function AppHeader({ dueCount }: { dueCount?: number }) {
  const router = useRouter();
  const { email, lock, logout } = useVault();
  const { theme, toggleTheme } = useTheme();

  // Quick lock: keep the session cookie and the PIN so the user can come back
  // with just the PIN. Falls back to /unlock when no PIN is set.
  function onLock() {
    lock();
    router.push(hasPinSetup() ? "/pin" : "/unlock");
  }

  // Full sign-out: erase the PIN and destroy the server session.
  async function onLogout() {
    logout();
    await apiLogout().catch(() => {});
    router.push("/unlock");
  }

  return (
    <header className="border-b border-[var(--border)] bg-[var(--surface)]">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold">
          <span>🔐 Passwork</span>
          {dueCount ? (
            <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs font-semibold text-white">
              {dueCount} cần xem
            </span>
          ) : null}
        </Link>
        <div className="flex items-center gap-2 text-sm">
          {email && (
            <span className="mr-1 hidden text-[var(--text-muted)] sm:inline">{email}</span>
          )}
          <button onClick={toggleTheme} className="btn-secondary" title="Đổi giao diện sáng/tối">
            {theme === "dark" ? "Sáng" : "Tối"}
          </button>
          <button onClick={onLock} className="btn-secondary">Khóa</button>
          <button onClick={onLogout} className="btn-secondary">Đăng xuất</button>
        </div>
      </div>
    </header>
  );
}
