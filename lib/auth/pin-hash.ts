/**
 * Salted, stretched SHA-256 of the app PIN, so SecureStore never holds the PIN itself.
 *
 * Format: `sha256i$<iterations>$<saltHex>$<hashHex>` (iterations are stored, so they can be tuned
 * later without breaking existing hashes).
 *
 * Cost: each round is one native `Crypto.digest` call on 48 bytes (on Android a synchronous JSI
 * call, roughly 5–20 µs including the awaited promise), so 2,000 rounds land around 10–40 ms on a
 * mid-range phone — well under the ~150 ms budget for unlocking. A 4–6 digit PIN can't be made
 * brute-force proof by stretching alone; the real protection is that the hash lives in the
 * Keystore/Keychain-backed SecureStore and that the lock screen rate-limits attempts
 * (components/onboarding/pin-guard.ts). Stretching just makes an offline guess pass cost more.
 *
 * @example
 * const stored = await hashPIN('1234');
 * await verifyPINHash('1234', stored); // true
 */
import * as Crypto from 'expo-crypto';

export const PIN_HASH_PREFIX = 'sha256i';
export const PIN_HASH_ITERATIONS = 2000;
const SALT_BYTES = 16;

export function bytesToHex(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i++) out += bytes[i].toString(16).padStart(2, '0');
  return out;
}

export function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
  return out;
}

function utf8(text: string): Uint8Array {
  // PINs are digits only, but stay correct for any input (no TextEncoder dependency).
  const out: number[] = [];
  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    if (cp < 0x80) out.push(cp);
    else if (cp < 0x800) out.push(0xc0 | (cp >> 6), 0x80 | (cp & 63));
    else if (cp < 0x10000)
      out.push(0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63));
    else
      out.push(
        0xf0 | (cp >> 18),
        0x80 | ((cp >> 12) & 63),
        0x80 | ((cp >> 6) & 63),
        0x80 | (cp & 63)
      );
  }
  return new Uint8Array(out);
}

function concat(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}

async function sha256(data: Uint8Array): Promise<Uint8Array> {
  return new Uint8Array(
    await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, data as Uint8Array<ArrayBuffer>)
  );
}

/** h₀ = SHA-256(salt ‖ pin); hᵢ = SHA-256(hᵢ₋₁ ‖ salt). */
async function derive(pin: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  let h = await sha256(concat(salt, utf8(pin)));
  const buf = new Uint8Array(h.length + salt.length);
  buf.set(salt, h.length);
  for (let i = 1; i < iterations; i++) {
    buf.set(h, 0);
    h = await sha256(buf);
  }
  return h;
}

/** Compares two strings in time independent of where they first differ. */
export function constantTimeEqual(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

export async function hashPIN(pin: string, iterations: number = PIN_HASH_ITERATIONS) {
  const salt = Crypto.getRandomBytes(SALT_BYTES);
  const hash = await derive(pin, salt, iterations);
  return `${PIN_HASH_PREFIX}$${iterations}$${bytesToHex(salt)}$${bytesToHex(hash)}`;
}

export function isPINHash(value: string | null | undefined): value is string {
  return parsePINHash(value) !== null;
}

function parsePINHash(value: string | null | undefined) {
  if (!value) return null;
  const parts = value.split('$');
  if (parts.length !== 4 || parts[0] !== PIN_HASH_PREFIX) return null;
  const iterations = Number(parts[1]);
  if (!Number.isInteger(iterations) || iterations < 1 || iterations > 1_000_000) return null;
  if (!/^[0-9a-f]+$/.test(parts[2]) || parts[2].length % 2 !== 0) return null;
  if (!/^[0-9a-f]{64}$/.test(parts[3])) return null;
  return { iterations, salt: hexToBytes(parts[2]), hash: parts[3] };
}

export async function verifyPINHash(pin: string, stored: string): Promise<boolean> {
  const parsed = parsePINHash(stored);
  if (!parsed) return false;
  const actual = bytesToHex(await derive(pin, parsed.salt, parsed.iterations));
  return constantTimeEqual(actual, parsed.hash);
}
