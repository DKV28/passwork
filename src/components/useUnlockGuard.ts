"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useVault } from "@/components/VaultProvider";
import { hasPinSetup } from "@/lib/pin";

/**
 * Redirects when the vault is locked (e.g. after a page reload, where the
 * in-memory encryption key is gone). If a PIN has been set up on this device we
 * send the user to the fast /pin unlock; otherwise to the full /unlock page.
 * Returns whether the vault is unlocked so callers can avoid rendering protected
 * content during the redirect.
 */
export function useUnlockGuard(): boolean {
  const router = useRouter();
  const { isUnlocked } = useVault();

  useEffect(() => {
    if (!isUnlocked) {
      const next = encodeURIComponent(window.location.pathname);
      router.replace(hasPinSetup() ? `/pin?next=${next}` : `/unlock?next=${next}`);
    }
  }, [isUnlocked, router]);

  return isUnlocked;
}
