"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useVault } from "@/components/VaultProvider";
import { decrypt } from "@/lib/crypto";
import type { VaultEntryDTO } from "@/lib/api";
import { ageLabel } from "@/lib/format";

const CLIPBOARD_CLEAR_MS = 30_000;

// Tries the modern Clipboard API first; falls back to the legacy execCommand
// approach for browsers/webviews where clipboard permission is unavailable.
async function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // fall through to legacy approach
    }
  }
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.cssText = "position:fixed;top:-9999px;left:-9999px;opacity:0";
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  const ok = document.execCommand("copy");
  document.body.removeChild(ta);
  if (!ok) throw new Error("execCommand copy failed");
}

export function EntryList({ entries, search = "" }: { entries: VaultEntryDTO[]; search?: string }) {
  const { encKey } = useVault();
  // entryId -> decrypted password (lazy; only present while revealed)
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState<Record<string, boolean>>({});
  const [rowError, setRowError] = useState<Record<string, string>>({});
  const copyTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const q = search.trim().toLowerCase();
  const filtered = q
    ? entries.filter((e) =>
        [e.label, e.username, e.url].some((f) => f?.toLowerCase().includes(q)),
      )
    : entries;

  async function handleReveal(e: VaultEntryDTO) {
    if (!encKey) return;
    if (revealed[e.id]) {
      setRevealed((prev) => {
        const n = { ...prev };
        delete n[e.id];
        return n;
      });
      return;
    }
    try {
      const plain = await decrypt(e.passwordCipher, e.passwordIv, encKey);
      setRevealed((prev) => ({ ...prev, [e.id]: plain }));
    } catch {
      setRowError((prev) => ({ ...prev, [e.id]: "Không giải mã được." }));
    }
  }

  async function handleCopy(e: VaultEntryDTO) {
    if (!encKey) return;
    setRowError((prev) => { const n = { ...prev }; delete n[e.id]; return n; });
    try {
      // Decrypt first (async) and store so user can copy manually if clipboard fails.
      const plain = revealed[e.id] ?? (await decrypt(e.passwordCipher, e.passwordIv, encKey));
      if (!revealed[e.id]) setRevealed((prev) => ({ ...prev, [e.id]: plain }));

      // Attempt clipboard copy. On iOS the gesture context is already lost after
      // the await above, so we try both APIs and silently reveal on failure.
      let clipOk = false;
      try {
        await copyToClipboard(plain);
        clipOk = true;
      } catch {
        // clipboard failed — password is now revealed so user can copy manually
      }

      if (clipOk) {
        setCopied((prev) => ({ ...prev, [e.id]: true }));
        if (copyTimers.current[e.id]) clearTimeout(copyTimers.current[e.id]);
        copyTimers.current[e.id] = setTimeout(
          () => setCopied((prev) => ({ ...prev, [e.id]: false })),
          2_000,
        );
        setTimeout(() => { copyToClipboard("").catch(() => {}); }, CLIPBOARD_CLEAR_MS);
      } else {
        setRowError((prev) => ({ ...prev, [e.id]: "Không sao chép được tự động — mật khẩu đã hiện, hãy sao chép thủ công." }));
      }
    } catch {
      setRowError((prev) => ({ ...prev, [e.id]: "Không giải mã được." }));
    }
  }

  if (entries.length === 0) {
    return (
      <div className="card flex flex-col items-center gap-1 py-10 text-center">
        <p className="font-medium">Kho trống</p>
        <p className="text-sm text-[var(--text-muted)]">Hãy thêm tài khoản đầu tiên của bạn.</p>
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="card text-center text-sm text-[var(--text-muted)]">
        Không tìm thấy kết quả cho “{search}”.
      </div>
    );
  }

  return (
    <ul className="divide-y divide-[var(--border)] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
      {filtered.map((e) => (
        <li key={e.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.04]">
          <Link href={`/entries/${e.id}`} className="min-w-0 flex-1">
            <p className="truncate font-medium">{e.label}</p>
            <p className="truncate text-sm text-[var(--text-muted)]">{e.username || e.url || "—"}</p>
            {rowError[e.id] && <p className="text-xs text-red-600">{rowError[e.id]}</p>}
          </Link>

          {revealed[e.id] && (
            <code className="order-last w-full truncate rounded bg-black/5 px-2 py-1 font-mono text-xs sm:order-none sm:w-auto sm:max-w-[160px] dark:bg-white/10">
              {revealed[e.id]}
            </code>
          )}

          <div className="flex shrink-0 gap-1">
            <button
              type="button"
              onClick={() => handleReveal(e)}
              className="btn-secondary px-2.5 py-1 text-xs"
            >
              {revealed[e.id] ? "Ẩn" : "Hiện"}
            </button>
            <button
              type="button"
              onClick={() => handleCopy(e)}
              className="btn-secondary px-2.5 py-1 text-xs"
            >
              {copied[e.id] ? "Đã sao chép!" : "Sao chép"}
            </button>
          </div>

          <span className="shrink-0 text-xs text-[var(--text-muted)]">{ageLabel(e.lastChangedAt)}</span>
        </li>
      ))}
    </ul>
  );
}
