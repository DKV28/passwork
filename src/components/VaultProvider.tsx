"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { clearPin } from "@/lib/pin";

/**
 * Holds the AES-GCM encryption key in memory for the duration of an unlocked
 * session. The key is NEVER persisted (no localStorage/cookies) and is dropped
 * on lock, tab close, or inactivity — so a reload always requires re-unlocking.
 */

const AUTO_LOCK_MS = 10 * 60 * 1000; // 10 minutes of inactivity

interface VaultState {
  encKey: CryptoKey | null;
  email: string | null;
  isUnlocked: boolean;
  unlock: (encKey: CryptoKey, email: string) => void;
  /** Drop the in-memory key (auto-lock / quick lock). PIN data is kept so the
   *  vault can be re-opened with the PIN. */
  lock: () => void;
  /** Full sign-out: drop the key AND erase the PIN blob from this device. */
  logout: () => void;
}

const VaultContext = createContext<VaultState | null>(null);

export function VaultProvider({ children }: { children: React.ReactNode }) {
  const [encKey, setEncKey] = useState<CryptoKey | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lock = useCallback(() => {
    setEncKey(null);
    setEmail(null);
  }, []);

  const logout = useCallback(() => {
    clearPin();
    setEncKey(null);
    setEmail(null);
  }, []);

  const resetTimer = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(lock, AUTO_LOCK_MS);
  }, [lock]);

  const unlock = useCallback(
    (key: CryptoKey, mail: string) => {
      setEncKey(key);
      setEmail(mail);
      resetTimer();
    },
    [resetTimer],
  );

  // Reset the auto-lock countdown on user activity while unlocked.
  useEffect(() => {
    if (!encKey) return;
    const events = ["mousedown", "keydown", "touchstart", "scroll"] as const;
    const onActivity = () => resetTimer();
    events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    return () => {
      events.forEach((e) => window.removeEventListener(e, onActivity));
      if (timer.current) clearTimeout(timer.current);
    };
  }, [encKey, resetTimer]);

  return (
    <VaultContext.Provider value={{ encKey, email, isUnlocked: Boolean(encKey), unlock, lock, logout }}>
      {children}
    </VaultContext.Provider>
  );
}

export function useVault(): VaultState {
  const ctx = useContext(VaultContext);
  if (!ctx) throw new Error("useVault must be used within a VaultProvider");
  return ctx;
}
