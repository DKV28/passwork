"use client";

import { useState } from "react";
import { generatePassword } from "@/lib/crypto";

/** Password input with reveal toggle and a strong-password generator. */
export function PasswordField({
  id,
  value,
  onChange,
  autoComplete = "new-password",
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
}) {
  const [reveal, setReveal] = useState(false);

  return (
    <div className="flex gap-2">
      <input
        id={id}
        type={reveal ? "text" : "password"}
        className="input font-mono"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
      />
      <button type="button" className="btn-secondary shrink-0" onClick={() => setReveal((r) => !r)}>
        {reveal ? "Ẩn" : "Hiện"}
      </button>
      <button
        type="button"
        className="btn-secondary shrink-0"
        title="Tạo mật khẩu mạnh"
        onClick={() => {
          onChange(generatePassword(20));
          setReveal(true);
        }}
      >
        Tạo
      </button>
    </div>
  );
}
