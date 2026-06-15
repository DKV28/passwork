import { describe, it, expect } from "vitest";
import {
  generateSalt,
  deriveEncKey,
  deriveAuthHash,
  encrypt,
  decrypt,
  wrapKey,
  unwrapKey,
  generatePassword,
  base64ToBytes,
  bytesToBase64,
} from "./crypto";

// Use a low iteration count in tests so they run fast; the crypto logic is
// identical regardless of the cost factor.
const FAST = 1000;
const MASTER = "correct horse battery staple";

describe("base64 helpers", () => {
  it("round-trips arbitrary bytes", () => {
    const bytes = new Uint8Array([0, 1, 2, 250, 255, 128, 64]);
    expect(Array.from(base64ToBytes(bytesToBase64(bytes)))).toEqual(Array.from(bytes));
  });
});

describe("salts", () => {
  it("generates distinct 16-byte salts", () => {
    const a = generateSalt();
    const b = generateSalt();
    expect(a).not.toEqual(b);
    expect(base64ToBytes(a).length).toBe(16);
  });
});

describe("encrypt / decrypt round-trip", () => {
  it("decrypts what it encrypts", async () => {
    const salt = generateSalt();
    const key = await deriveEncKey(MASTER, salt, FAST);
    const secret = "s3cr3t-pässwörd-🔐";

    const enc = await encrypt(secret, key);
    expect(enc.cipher).not.toContain(secret);

    const dec = await decrypt(enc.cipher, enc.iv, key);
    expect(dec).toBe(secret);
  });

  it("uses a unique IV for every encryption", async () => {
    const salt = generateSalt();
    const key = await deriveEncKey(MASTER, salt, FAST);
    const a = await encrypt("same", key);
    const b = await encrypt("same", key);
    expect(a.iv).not.toBe(b.iv);
    expect(a.cipher).not.toBe(b.cipher);
  });
});

describe("key derivation isolation", () => {
  it("derives different keys for different salts (wrong key cannot decrypt)", async () => {
    const saltA = generateSalt();
    const saltB = generateSalt();
    const keyA = await deriveEncKey(MASTER, saltA, FAST);
    const keyB = await deriveEncKey(MASTER, saltB, FAST);

    const enc = await encrypt("hello", keyA);
    await expect(decrypt(enc.cipher, enc.iv, keyB)).rejects.toThrow();
  });

  it("auth verifier is stable for same input and differs across salts", async () => {
    const salt = generateSalt();
    const h1 = await deriveAuthHash(MASTER, salt, FAST);
    const h2 = await deriveAuthHash(MASTER, salt, FAST);
    expect(h1).toBe(h2);

    const h3 = await deriveAuthHash(MASTER, generateSalt(), FAST);
    expect(h3).not.toBe(h1);
  });

  it("wrong master password yields a different verifier", async () => {
    const salt = generateSalt();
    const right = await deriveAuthHash(MASTER, salt, FAST);
    const wrong = await deriveAuthHash("not the master", salt, FAST);
    expect(right).not.toBe(wrong);
  });
});

describe("tamper detection", () => {
  it("fails to decrypt mutated ciphertext", async () => {
    const salt = generateSalt();
    const key = await deriveEncKey(MASTER, salt, FAST);
    const enc = await encrypt("important", key);

    const bytes = base64ToBytes(enc.cipher);
    bytes[0] ^= 0xff; // flip a bit
    const tampered = bytesToBase64(bytes);

    await expect(decrypt(tampered, enc.iv, key)).rejects.toThrow();
  });
});

describe("key wrapping (PIN unlock)", () => {
  it("unwraps with the right PIN-key and still decrypts existing data", async () => {
    const encSalt = generateSalt();
    // The key to wrap must be extractable.
    const encKey = await deriveEncKey(MASTER, encSalt, FAST, true);
    const enc = await encrypt("my-secret", encKey);

    const pinSalt = generateSalt();
    const wrappingKey = await deriveEncKey("123456", pinSalt, FAST);
    const wrapped = await wrapKey(encKey, wrappingKey);
    expect(wrapped.cipher).not.toContain("my-secret");

    const recovered = await unwrapKey(wrapped, wrappingKey);
    const dec = await decrypt(enc.cipher, enc.iv, recovered);
    expect(dec).toBe("my-secret");
  });

  it("fails to unwrap with the wrong PIN", async () => {
    const encSalt = generateSalt();
    const encKey = await deriveEncKey(MASTER, encSalt, FAST, true);

    const pinSalt = generateSalt();
    const right = await deriveEncKey("123456", pinSalt, FAST);
    const wrong = await deriveEncKey("000000", pinSalt, FAST);

    const wrapped = await wrapKey(encKey, right);
    await expect(unwrapKey(wrapped, wrong)).rejects.toThrow();
  });

  it("cannot wrap a non-extractable key", async () => {
    const encSalt = generateSalt();
    const nonExtractable = await deriveEncKey(MASTER, encSalt, FAST); // default false
    const wrappingKey = await deriveEncKey("123456", generateSalt(), FAST);
    await expect(wrapKey(nonExtractable, wrappingKey)).rejects.toThrow();
  });
});

describe("password generator", () => {
  it("produces a password of the requested length", () => {
    expect(generatePassword(24).length).toBe(24);
  });

  it("produces distinct passwords", () => {
    expect(generatePassword()).not.toBe(generatePassword());
  });

  it("omits symbols when asked", () => {
    const pw = generatePassword(40, false);
    expect(/^[a-zA-Z0-9]+$/.test(pw)).toBe(true);
  });
});
