import { describe, it, expect, beforeEach, vi } from "vitest";

// pin.ts derives wrapping keys at 600k iterations, which is slow. We don't need
// to override that for correctness, but a tiny in-memory localStorage is needed
// since these tests run under Node.
class MemoryStorage {
  private store = new Map<string, string>();
  getItem(k: string) {
    return this.store.has(k) ? this.store.get(k)! : null;
  }
  setItem(k: string, v: string) {
    this.store.set(k, String(v));
  }
  removeItem(k: string) {
    this.store.delete(k);
  }
  clear() {
    this.store.clear();
  }
}

vi.stubGlobal("window", { localStorage: new MemoryStorage() });

import {
  hasPinSetup,
  setupPin,
  unlockWithPin,
  clearPin,
  getPinFailCount,
  MAX_FAILS,
} from "./pin";
import { deriveEncKey, encrypt, decrypt, generateSalt } from "./crypto";

async function makeExtractableEncKey() {
  const salt = generateSalt();
  // Use the real default iterations path but with an extractable key.
  return { key: await deriveEncKey("master-pw", salt, 1000, true), salt };
}

describe("PIN unlock flow", () => {
  beforeEach(() => clearPin());

  it("round-trips: setup then unlock recovers a working key + email", async () => {
    const { key } = await makeExtractableEncKey();
    const secret = await encrypt("hunter2", key);

    expect(hasPinSetup()).toBe(false);
    await setupPin("123456", key, "me@example.com");
    expect(hasPinSetup()).toBe(true);

    const { encKey, email } = await unlockWithPin("123456");
    expect(email).toBe("me@example.com");
    // The recovered key decrypts data encrypted with the original key.
    expect(await decrypt(secret.cipher, secret.iv, encKey)).toBe("hunter2");
  });

  it("rejects PINs shorter than 6 digits at setup", async () => {
    const { key } = await makeExtractableEncKey();
    await expect(setupPin("123", key, "a@b.com")).rejects.toThrow();
  });

  it("counts failures and locks out after MAX_FAILS", async () => {
    const { key } = await makeExtractableEncKey();
    await setupPin("123456", key, "a@b.com");

    for (let i = 1; i <= MAX_FAILS; i++) {
      await expect(unlockWithPin("000000")).rejects.toThrow();
      expect(getPinFailCount()).toBe(i);
    }
    // Even the correct PIN is now refused (locked out).
    await expect(unlockWithPin("123456")).rejects.toThrow(/khóa|đăng nhập lại/i);
  });

  it("a correct PIN resets the failure counter", async () => {
    const { key } = await makeExtractableEncKey();
    await setupPin("123456", key, "a@b.com");

    await expect(unlockWithPin("000000")).rejects.toThrow();
    expect(getPinFailCount()).toBe(1);

    await unlockWithPin("123456");
    expect(getPinFailCount()).toBe(0);
  });

  it("clearPin removes all data", async () => {
    const { key } = await makeExtractableEncKey();
    await setupPin("123456", key, "a@b.com");
    expect(hasPinSetup()).toBe(true);
    clearPin();
    expect(hasPinSetup()).toBe(false);
    await expect(unlockWithPin("123456")).rejects.toThrow();
  });
});
