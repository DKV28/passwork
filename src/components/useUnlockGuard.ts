"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useVault } from "@/components/VaultProvider";

/**
 * Redirects to /unlock when the vault is locked (e.g. after a page reload, where
 * the in-memory encryption key is gone). Returns whether the vault is unlocked
 * so callers can avoid rendering protected content during the redirect.
 */
export function useUnlockGuard(): boolean {
  const router = useRouter();
  const { isUnlocked } = useVault();

  useEffect(() => {
    if (!isUnlocked) {
      const next = window.location.pathname;
      router.replace(`/unlock?next=${encodeURIComponent(next)}`);
    }
  }, [isUnlocked, router]);

  return isUnlocked;
}
