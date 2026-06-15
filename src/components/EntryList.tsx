"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useVault } from "@/components/VaultProvider";
import { decrypt } from "@/lib/crypto";
import type { VaultEntryDTO } from "@/lib/api";
import { ageLabel } from "@/lib/format";

const CLIPBOARD_CLEAR_MS = 30_000;

async function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch { /* fall through */ }
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

export function EntryList({
  entries,
  filtered,
  search = "",
}: {
  entries: VaultEntryDTO[];
  filtered?: VaultEntryDTO[];
  search?: string;
}) {
  const { encKey } = useVault();
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState<Record<string, boolean>>({});
  const [rowError, setRowError] = useState<Record<string, string>>({});
  const copyTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Accept pre-filtered list from parent or compute locally
  const list: VaultEntryDTO[] = filtered ?? (() => {
    const q = search.trim().toLowerCase();
    return q
      ? entries.filter((e) => [e.label, e.username, e.url].some((f) => f?.toLowerCase().includes(q)))
      : entries;
  })();

  async function handleReveal(e: VaultEntryDTO) {
    if (!encKey) return;
    if (revealed[e.id]) {
      setRevealed((prev) => { const n = { ...prev }; delete n[e.id]; return n; });
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

    // If already decrypted, copy synchronously (satisfies iOS gesture requirement).
    if (revealed[e.id]) {
      const plain = revealed[e.id];
      let clipOk = false;
      try {
        const ta = document.createElement("textarea");
        ta.value = plain;
        ta.style.cssText = "position:fixed;top:-9999px;left:-9999px;opacity:0";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        clipOk = document.execCommand("copy");
        document.body.removeChild(ta);
      } catch { /* ignore */ }
      if (!clipOk) {
        try { await navigator.clipboard.writeText(plain); clipOk = true; } catch { /* ignore */ }
      } else {
        navigator.clipboard?.writeText(plain).catch(() => {});
      }

      if (clipOk) {
        setCopied((prev) => ({ ...prev, [e.id]: true }));
        if (copyTimers.current[e.id]) clearTimeout(copyTimers.current[e.id]);
        copyTimers.current[e.id] = setTimeout(
          () => setCopied((prev) => ({ ...prev, [e.id]: false })),
          2_000,
        );
        setTimeout(() => { navigator.clipboard?.writeText("").catch(() => {}); }, CLIPBOARD_CLEAR_MS);
      } else {
        setRowError((prev) => ({ ...prev, [e.id]: "Không sao chép được — hãy giữ và chọn thủ công." }));
      }
      return;
    }

    // Not yet decrypted — decrypt, reveal, prompt to tap copy again.
    try {
      const plain = await decrypt(e.passwordCipher, e.passwordIv, encKey);
      setRevealed((prev) => ({ ...prev, [e.id]: plain }));
      setRowError((prev) => ({ ...prev, [e.id]: "Nhấn 'Sao chép' lần nữa." }));
    } catch {
      setRowError((prev) => ({ ...prev, [e.id]: "Không giải mã được." }));
    }
  }

  if (entries.length === 0) {
    return (
      <div
        className="flex flex-col items-center gap-2 rounded-2xl border py-14 text-center"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <p className="font-semibold" style={{ color: "var(--text)" }}>Kho đang trống</p>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Thêm tài khoản đầu tiên để bắt đầu.
        </p>
      </div>
    );
  }

  if (list.length === 0) {
    return (
      <div
        className="rounded-2xl border px-4 py-10 text-center text-sm"
        style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--text-muted)" }}
      >
        Không có kết quả cho <strong style={{ color: "var(--text)" }}>"{search}"</strong>
      </div>
    );
  }

  return (
    <ul
      className="overflow-hidden rounded-2xl border"
      style={{ borderColor: "var(--border)", background: "var(--surface)", boxShadow: "var(--shadow)" }}
    >
      {list.map((e, idx) => (
        <li
          key={e.id}
          className="transition-colors duration-100"
          style={{
            borderTop: idx === 0 ? "none" : `1px solid var(--border-subtle)`,
          }}
        >
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3.5 hover:bg-black/[0.02] dark:hover:bg-white/[0.03]">
            {/* Avatar letter */}
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
              style={{
                background: `hsl(${(e.label.charCodeAt(0) * 37) % 360} 55% 50%)`,
              }}
            >
              {e.label.charAt(0).toUpperCase()}
            </div>

            {/* Label + username — taps navigate to edit */}
            <Link href={`/entries/${e.id}`} className="min-w-0 flex-1">
              <p className="truncate font-semibold text-sm" style={{ color: "var(--text)" }}>
                {e.label}
              </p>
              <p className="truncate text-xs" style={{ color: "var(--text-muted)" }}>
                {e.username || e.url || "—"}
              </p>
            </Link>

            {/* Action buttons */}
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleReveal(e)}
                className="btn-secondary px-3 py-1.5 text-xs"
              >
                {revealed[e.id] ? "Ẩn" : "Hiện"}
              </button>
              {revealed[e.id] && (
                <button
                  type="button"
                  onClick={() => handleCopy(e)}
                  className="btn-secondary px-3 py-1.5 text-xs"
                  style={copied[e.id] ? { color: "var(--brand)" } : undefined}
                >
                  {copied[e.id] ? "Đã sao chép!" : "Sao chép"}
                </button>
              )}
            </div>

            {/* Age */}
            <span className="shrink-0 text-xs tabular-nums" style={{ color: "var(--text-faint)" }}>
              {ageLabel(e.lastChangedAt)}
            </span>
          </div>

          {/* Revealed password + error — full width under the row */}
          {(revealed[e.id] || rowError[e.id]) && (
            <div className="px-4 pb-3">
              {revealed[e.id] && (
                <code
                  className="block w-full rounded-xl px-3 py-2 font-mono text-sm"
                  style={{ background: "var(--surface-muted)", color: "var(--text)", letterSpacing: "0.05em" }}
                >
                  {revealed[e.id]}
                </code>
              )}
              {rowError[e.id] && (
                <p className="mt-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
                  {rowError[e.id]}
                </p>
              )}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
