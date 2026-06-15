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

  function onLock() {
    lock();
    router.push(hasPinSetup() ? "/pin" : "/unlock");
  }

  async function onLogout() {
    logout();
    await apiLogout().catch(() => {});
    router.push("/unlock");
  }

  return (
    <header
      className="sticky top-0 z-10 border-b"
      style={{
        backgroundColor: "color-mix(in srgb, var(--surface) 85%, transparent)",
        borderColor: "var(--border)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      }}
    >
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-lg text-sm"
            style={{ background: "var(--brand)", color: "#fff" }}
          >
            P
          </span>
          <span className="font-semibold tracking-tight" style={{ color: "var(--text)" }}>
            Passwork
          </span>
          {dueCount ? (
            <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs font-semibold text-white">
              {dueCount}
            </span>
          ) : null}
        </Link>

        <div className="flex items-center gap-1.5">
          {email && (
            <span
              className="mr-2 hidden text-xs sm:inline"
              style={{ color: "var(--text-muted)" }}
            >
              {email}
            </span>
          )}
          <button
            onClick={toggleTheme}
            className="btn-secondary px-3 py-1.5 text-xs"
            title="Đổi giao diện"
          >
            {theme === "dark" ? "Sáng" : "Tối"}
          </button>
          <button onClick={onLock} className="btn-secondary px-3 py-1.5 text-xs">
            Khóa
          </button>
          <button
            onClick={onLogout}
            className="btn-secondary px-3 py-1.5 text-xs"
            style={{ color: "var(--text-muted)" }}
          >
            Đăng xuất
          </button>
        </div>
      </div>
    </header>
  );
}
