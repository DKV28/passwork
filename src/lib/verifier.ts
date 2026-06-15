/**
 * Server-side hashing of the client-derived auth verifier (authHash).
 *
 * The verifier is already the output of 600k PBKDF2 iterations over the master
 * password, i.e. a high-entropy 256-bit value — so a memory-hard scrypt pass is
 * ample as defense-in-depth, and (unlike a native argon2 addon) node:crypto is
 * always available in the serverless Node runtime.
 *
 * Stored format: "<saltBase64>:<hashBase64>".
 */
import crypto from "node:crypto";

const KEY_LEN = 32;
const SALT_LEN = 16;

export function hashVerifier(authHash: string): string {
  const salt = crypto.randomBytes(SALT_LEN);
  const dk = crypto.scryptSync(authHash, salt, KEY_LEN);
  return `${salt.toString("base64")}:${dk.toString("base64")}`;
}

export function verifyVerifier(authHash: string, stored: string): boolean {
  const [saltB64, hashB64] = stored.split(":");
  if (!saltB64 || !hashB64) return false;
  const salt = Buffer.from(saltB64, "base64");
  const expected = Buffer.from(hashB64, "base64");
  const dk = crypto.scryptSync(authHash, salt, expected.length);
  return dk.length === expected.length && crypto.timingSafeEqual(dk, expected);
}
