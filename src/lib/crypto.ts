/**
 * Passwork crypto — the SINGLE source of all cryptographic operations.
 *
 * Zero-knowledge model: everything here runs in the browser. The master
 * password and any derived encryption key never leave the device. The server
 * only ever sees salts, IVs, ciphertext and the auth verifier produced below.
 *
 * Works in the browser and in Node 20+ (tests) via the global Web Crypto API.
 */

const subtle = (): SubtleCrypto => {
  const c = globalThis.crypto;
  if (!c?.subtle) {
    throw new Error("Web Crypto API is not available in this environment.");
  }
  return c.subtle;
};

export const DEFAULT_KDF_ITERATIONS = 600_000;
const SALT_BYTES = 16;
const IV_BYTES = 12;
const AUTH_HASH_BYTES = 32;

// ---------------------------------------------------------------------------
// base64 helpers (work in browser and Node)
// ---------------------------------------------------------------------------

export function bytesToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Copy bytes into a standalone ArrayBuffer. Web Crypto's BufferSource params
 * require an ArrayBuffer-backed view; this normalizes across TS lib versions
 * (where Uint8Array became generic over ArrayBufferLike).
 */
function asBuffer(view: Uint8Array): ArrayBuffer {
  const out = new ArrayBuffer(view.byteLength);
  new Uint8Array(out).set(view);
  return out;
}

export function base64ToBytes(b64: string): Uint8Array {
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(b64, "base64"));
  }
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// ---------------------------------------------------------------------------
// random material
// ---------------------------------------------------------------------------

/** Random 16-byte salt, base64-encoded. */
export function generateSalt(): string {
  return bytesToBase64(globalThis.crypto.getRandomValues(new Uint8Array(SALT_BYTES)));
}

/** Random 12-byte IV (for a single AES-GCM encryption). */
function generateIv(): Uint8Array {
  return globalThis.crypto.getRandomValues(new Uint8Array(IV_BYTES));
}

// ---------------------------------------------------------------------------
// key derivation (PBKDF2)
// ---------------------------------------------------------------------------

async function importPasswordKey(masterPassword: string): Promise<CryptoKey> {
  return subtle().importKey(
    "raw",
    asBuffer(new TextEncoder().encode(masterPassword)),
    "PBKDF2",
    false,
    ["deriveKey", "deriveBits"],
  );
}

/**
 * Derive the AES-GCM encryption key from the master password + encSalt.
 *
 * By default the key is NON-extractable: it can encrypt/decrypt but cannot be
 * read out of memory. The optional `extractable` flag (default false) is only
 * set to true for the short-lived copy used during PIN setup, where the key
 * must be wrapped (which internally exports it). That copy is discarded
 * immediately after wrapping — the long-lived session key stays non-extractable.
 */
export async function deriveEncKey(
  masterPassword: string,
  encSaltB64: string,
  iterations: number = DEFAULT_KDF_ITERATIONS,
  extractable = false,
): Promise<CryptoKey> {
  const baseKey = await importPasswordKey(masterPassword);
  return subtle().deriveKey(
    {
      name: "PBKDF2",
      salt: asBuffer(base64ToBytes(encSaltB64)),
      iterations,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    extractable,
    ["encrypt", "decrypt"],
  );
}

// ---------------------------------------------------------------------------
// key wrapping (used by the optional PIN unlock feature)
// ---------------------------------------------------------------------------

/**
 * Wrap (encrypt) an extractable AES-GCM key with another AES-GCM "wrapping" key.
 * Used to store a PIN-protected copy of the encryption key.
 *
 * We export the key to raw bytes and AES-GCM encrypt those bytes, rather than
 * using SubtleCrypto.wrapKey — that keeps the wrapping key usable with the same
 * ["encrypt","decrypt"] usages that {@link deriveEncKey} produces. The key being
 * wrapped MUST be extractable, otherwise exportKey throws (by design).
 */
export async function wrapKey(keyToWrap: CryptoKey, wrappingKey: CryptoKey): Promise<Ciphertext> {
  const raw = new Uint8Array(await subtle().exportKey("raw", keyToWrap));
  const iv = generateIv();
  const buf = await subtle().encrypt({ name: "AES-GCM", iv: asBuffer(iv) }, wrappingKey, asBuffer(raw));
  return { cipher: bytesToBase64(new Uint8Array(buf)), iv: bytesToBase64(iv) };
}

/**
 * Unwrap a key previously produced by {@link wrapKey}. Throws (GCM auth failure)
 * if the wrapping key is wrong — e.g. the PIN was incorrect. The recovered key
 * is NON-extractable: it can only encrypt/decrypt, never be re-exported.
 */
export async function unwrapKey(wrapped: Ciphertext, wrappingKey: CryptoKey): Promise<CryptoKey> {
  const rawBuf = await subtle().decrypt(
    { name: "AES-GCM", iv: asBuffer(base64ToBytes(wrapped.iv)) },
    wrappingKey,
    asBuffer(base64ToBytes(wrapped.cipher)),
  );
  return subtle().importKey(
    "raw",
    rawBuf,
    { name: "AES-GCM", length: 256 },
    false, // recovered key is non-extractable
    ["encrypt", "decrypt"],
  );
}

/**
 * Derive the auth verifier from the master password + authSalt.
 * This base64 value is the ONLY password-derived secret sent to the server,
 * and it uses a DIFFERENT salt than the encryption key, so it can never be
 * used to derive the encryption key.
 */
export async function deriveAuthHash(
  masterPassword: string,
  authSaltB64: string,
  iterations: number = DEFAULT_KDF_ITERATIONS,
): Promise<string> {
  const baseKey = await importPasswordKey(masterPassword);
  const bits = await subtle().deriveBits(
    {
      name: "PBKDF2",
      salt: asBuffer(base64ToBytes(authSaltB64)),
      iterations,
      hash: "SHA-256",
    },
    baseKey,
    AUTH_HASH_BYTES * 8,
  );
  return bytesToBase64(new Uint8Array(bits));
}

// ---------------------------------------------------------------------------
// authenticated encryption (AES-GCM)
// ---------------------------------------------------------------------------

export interface Ciphertext {
  cipher: string; // base64 ciphertext (includes GCM auth tag)
  iv: string; // base64 IV, unique per encryption
}

/** Encrypt a UTF-8 string with a fresh random IV. */
export async function encrypt(plaintext: string, key: CryptoKey): Promise<Ciphertext> {
  const iv = generateIv();
  const buf = await subtle().encrypt(
    { name: "AES-GCM", iv: asBuffer(iv) },
    key,
    asBuffer(new TextEncoder().encode(plaintext)),
  );
  return { cipher: bytesToBase64(new Uint8Array(buf)), iv: bytesToBase64(iv) };
}

/**
 * Decrypt a value produced by {@link encrypt}. Throws if the key is wrong or
 * the ciphertext was tampered with (GCM authentication failure).
 */
export async function decrypt(cipherB64: string, ivB64: string, key: CryptoKey): Promise<string> {
  const buf = await subtle().decrypt(
    { name: "AES-GCM", iv: asBuffer(base64ToBytes(ivB64)) },
    key,
    asBuffer(base64ToBytes(cipherB64)),
  );
  return new TextDecoder().decode(buf);
}

// ---------------------------------------------------------------------------
// password generator (used by the "create strong password" UX)
// ---------------------------------------------------------------------------

const PW_LOWER = "abcdefghijkmnopqrstuvwxyz";
const PW_UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const PW_DIGITS = "23456789";
const PW_SYMBOLS = "!@#$%^&*()-_=+[]{}";

/** Generate a cryptographically-random password from the given character sets. */
export function generatePassword(length = 20, useSymbols = true): string {
  const alphabet = PW_LOWER + PW_UPPER + PW_DIGITS + (useSymbols ? PW_SYMBOLS : "");
  const out: string[] = [];
  const random = globalThis.crypto.getRandomValues(new Uint32Array(length));
  for (let i = 0; i < length; i++) {
    out.push(alphabet[random[i] % alphabet.length]);
  }
  return out.join("");
}
