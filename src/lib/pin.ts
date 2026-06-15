/**
 * Optional PIN unlock — a CONVENIENCE feature, not a strong security boundary.
 *
 * After unlocking with the master password, the user may set a PIN. We derive a
 * wrapping key from the PIN (PBKDF2 + a random salt) and store a PIN-wrapped
 * copy of the AES-GCM encryption key in localStorage, together with the email.
 * On a later visit (same device, valid session cookie still present) the vault
 * can be re-opened with just the PIN — no master password needed.
 *
 * ⚠️ SECURITY LIMITATIONS — be honest about the threat model:
 *  - A 6-digit PIN has only 1,000,000 combinations. Anyone who can COPY this
 *    device's localStorage (malware, a forensic disk image) can brute-force the
 *    wrapped blob OFFLINE — the AES-GCM tag tells them when a PIN guess is right.
 *  - The `pw_pin_fails` lockout counter below lives in that same localStorage,
 *    so it only deters a casual person poking at the live UI; it does NOT stop
 *    an offline attack.
 *  => PIN protects against a casual local user (someone who picks up the device),
 *     NOT against malware or someone who can copy the browser profile. For full
 *     protection the user should log out (which clears this blob).
 *
 * All functions touch localStorage, so they must only run in the browser
 * (event handlers / useEffect), never during SSR.
 */
import {
  generateSalt,
  deriveEncKey,
  wrapKey,
  unwrapKey,
  type Ciphertext,
} from "@/lib/crypto";

const LS_SALT = "pw_pin_salt";
const LS_ITER = "pw_pin_iter";
const LS_CIPHER = "pw_pin_cipher";
const LS_IV = "pw_pin_iv";
const LS_EMAIL = "pw_pin_email";
const LS_FAILS = "pw_pin_fails";

export const MAX_FAILS = 5;
export const MIN_PIN_LEN = 6;
const PIN_ITER = 600_000;

const ALL_KEYS = [LS_SALT, LS_ITER, LS_CIPHER, LS_IV, LS_EMAIL, LS_FAILS];

function ls(): Storage | null {
  return typeof window === "undefined" ? null : window.localStorage;
}

/** True when a complete PIN blob is present in localStorage. */
export function hasPinSetup(): boolean {
  const s = ls();
  if (!s) return false;
  return Boolean(
    s.getItem(LS_SALT) &&
      s.getItem(LS_ITER) &&
      s.getItem(LS_CIPHER) &&
      s.getItem(LS_IV) &&
      s.getItem(LS_EMAIL),
  );
}

/** Remove all PIN data. Called on explicit logout. */
export function clearPin(): void {
  const s = ls();
  if (!s) return;
  ALL_KEYS.forEach((k) => s.removeItem(k));
}

export function getPinFailCount(): number {
  const s = ls();
  if (!s) return 0;
  return Number.parseInt(s.getItem(LS_FAILS) ?? "0", 10) || 0;
}

export function resetPinAttempts(): void {
  ls()?.setItem(LS_FAILS, "0");
}

/**
 * Set up (or replace) the PIN. A fresh salt is generated each time so re-setup
 * never reuses old wrapping material.
 *
 * `encKeyExtractable` MUST be a key derived with `extractable: true` (see
 * deriveEncKey) so it can be wrapped. The caller derives a throwaway extractable
 * copy of the encryption key for exactly this call.
 */
export async function setupPin(
  pin: string,
  encKeyExtractable: CryptoKey,
  email: string,
): Promise<void> {
  const s = ls();
  if (!s) throw new Error("PIN chỉ có thể thiết lập trong trình duyệt.");
  if (!/^\d+$/.test(pin) || pin.length < MIN_PIN_LEN) {
    throw new Error(`PIN phải có ít nhất ${MIN_PIN_LEN} chữ số.`);
  }

  const salt = generateSalt();
  const wrappingKey = await deriveEncKey(pin, salt, PIN_ITER);
  const wrapped = await wrapKey(encKeyExtractable, wrappingKey);

  s.setItem(LS_SALT, salt);
  s.setItem(LS_ITER, String(PIN_ITER));
  s.setItem(LS_CIPHER, wrapped.cipher);
  s.setItem(LS_IV, wrapped.iv);
  s.setItem(LS_EMAIL, email);
  s.setItem(LS_FAILS, "0");
}

/**
 * Recover the encryption key from the stored blob using the PIN. Returns the
 * (non-extractable) encKey plus the email needed to populate the vault context.
 * Throws on wrong PIN (incrementing the fail counter) or when locked out.
 */
export async function unlockWithPin(pin: string): Promise<{ encKey: CryptoKey; email: string }> {
  const s = ls();
  if (!s) throw new Error("PIN chỉ dùng được trong trình duyệt.");
  if (!hasPinSetup()) throw new Error("Chưa thiết lập PIN trên thiết bị này.");

  if (getPinFailCount() >= MAX_FAILS) {
    throw new Error("PIN đã bị khóa do nhập sai quá nhiều lần. Hãy đăng nhập lại bằng master password.");
  }

  const salt = s.getItem(LS_SALT)!;
  const iter = Number.parseInt(s.getItem(LS_ITER) ?? String(PIN_ITER), 10) || PIN_ITER;
  const wrapped: Ciphertext = { cipher: s.getItem(LS_CIPHER)!, iv: s.getItem(LS_IV)! };
  const email = s.getItem(LS_EMAIL)!;

  const wrappingKey = await deriveEncKey(pin, salt, iter);
  try {
    const encKey = await unwrapKey(wrapped, wrappingKey);
    resetPinAttempts();
    return { encKey, email };
  } catch {
    const fails = getPinFailCount() + 1;
    s.setItem(LS_FAILS, String(fails));
    const left = MAX_FAILS - fails;
    if (left <= 0) {
      throw new Error("PIN sai. Đã hết lượt thử — hãy đăng nhập lại bằng master password.");
    }
    throw new Error(`PIN không đúng. Còn ${left} lần thử.`);
  }
}
