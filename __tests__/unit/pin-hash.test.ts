import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createHash } from 'node:crypto';
import * as SecureStore from 'expo-secure-store';
import {
  constantTimeEqual,
  hashPIN,
  isPINHash,
  verifyPINHash,
  hexToBytes,
} from '@/lib/auth/pin-hash';
import { confirmIdentity, deletePIN, hasPIN, setPIN, verifyPIN } from '@/lib/auth';
import * as LocalAuthentication from 'expo-local-authentication';

vi.mock('expo-local-authentication', () => ({
  hasHardwareAsync: vi.fn(() => Promise.resolve(true)),
  isEnrolledAsync: vi.fn(() => Promise.resolve(true)),
  supportedAuthenticationTypesAsync: vi.fn(() => Promise.resolve([])),
  authenticateAsync: vi.fn(() => Promise.resolve({ success: true })),
  AuthenticationType: { FINGERPRINT: 1, FACIAL_RECOGNITION: 2, IRIS: 3 },
}));

/** In-memory SecureStore. */
const store = new Map<string, string>();
beforeEach(() => {
  store.clear();
  vi.mocked(SecureStore.getItemAsync).mockImplementation(async (k: string) => store.get(k) ?? null);
  vi.mocked(SecureStore.setItemAsync).mockImplementation(async (k: string, v: string) => {
    store.set(k, v);
  });
  vi.mocked(SecureStore.deleteItemAsync).mockImplementation(async (k: string) => {
    store.delete(k);
  });
});

describe('pin-hash', () => {
  it('produces the documented format and verifies', async () => {
    const h = await hashPIN('1234');
    expect(h).toMatch(/^sha256i\$2000\$[0-9a-f]{32}\$[0-9a-f]{64}$/);
    expect(isPINHash(h)).toBe(true);
    expect(await verifyPINHash('1234', h)).toBe(true);
    expect(await verifyPINHash('1235', h)).toBe(false);
    expect(await verifyPINHash('12340', h)).toBe(false);
  });

  it('uses a fresh salt each time', async () => {
    const [a, b] = await Promise.all([hashPIN('1234'), hashPIN('1234')]);
    expect(a).not.toBe(b);
  });

  it('matches an independent implementation of the derivation', async () => {
    const h = await hashPIN('482916', 3);
    const [, , saltHex, hashHex] = h.split('$');
    const salt = Buffer.from(hexToBytes(saltHex));
    let d = createHash('sha256').update(Buffer.concat([salt, Buffer.from('482916')])).digest();
    for (let i = 1; i < 3; i++) d = createHash('sha256').update(Buffer.concat([d, salt])).digest();
    expect(d.toString('hex')).toBe(hashHex);
  });

  it('rejects malformed hashes', async () => {
    expect(isPINHash('1234')).toBe(false);
    expect(isPINHash('sha256i$abc$00$' + '0'.repeat(64))).toBe(false);
    expect(isPINHash(null)).toBe(false);
    expect(await verifyPINHash('1234', 'nonsense')).toBe(false);
  });

  it('constantTimeEqual', () => {
    expect(constantTimeEqual('abc', 'abc')).toBe(true);
    expect(constantTimeEqual('abc', 'abd')).toBe(false);
    expect(constantTimeEqual('abc', 'abcd')).toBe(false);
    expect(constantTimeEqual('', '')).toBe(true);
  });
});

describe('PIN storage', () => {
  it('setPIN → verifyPIN round trip, no plaintext stored', async () => {
    await setPIN('2468');
    expect([...store.values()]).not.toContain('2468');
    expect(store.get('user_pin_length')).toBe('4');
    expect(await verifyPIN('2468')).toBe(true);
    expect(await verifyPIN('1357')).toBe(false);
    expect(await hasPIN()).toBe(true);
  });

  it('migrates a legacy plaintext PIN on the first correct entry', async () => {
    store.set('user_pin', '9876');
    expect(await hasPIN()).toBe(true);
    expect(await verifyPIN('1111')).toBe(false);
    expect(store.get('user_pin')).toBe('9876'); // wrong entry: untouched
    expect(await verifyPIN('9876')).toBe(true);
    expect(store.has('user_pin')).toBe(false);
    expect(isPINHash(store.get('user_pin_hash'))).toBe(true);
    expect(store.get('user_pin_length')).toBe('4');
    expect(await verifyPIN('9876')).toBe(true); // now via the hash
  });

  it('setPIN removes a legacy plaintext PIN', async () => {
    store.set('user_pin', '9876');
    await setPIN('123456');
    expect(store.has('user_pin')).toBe(false);
    expect(await verifyPIN('9876')).toBe(false);
    expect(await verifyPIN('123456')).toBe(true);
  });

  it('deletePIN removes hash, legacy and length', async () => {
    store.set('user_pin', '9876');
    await setPIN('1234');
    store.set('user_pin', '9876');
    await deletePIN();
    expect(store.size).toBe(0);
    expect(await hasPIN()).toBe(false);
    expect(await verifyPIN('1234')).toBe(false);
  });
});

describe('confirmIdentity', () => {
  it('confirms straight away without a lock', async () => {
    expect(await confirmIdentity()).toBe('confirmed');
  });

  it('asks the UI for the PIN with a PIN lock', async () => {
    store.set('auth_method', 'pin');
    await setPIN('1234');
    expect(await confirmIdentity()).toBe('needs-pin');
  });

  it('uses biometrics with a biometric lock', async () => {
    store.set('auth_method', 'biometric');
    vi.mocked(LocalAuthentication.authenticateAsync).mockResolvedValueOnce({ success: true } as any);
    expect(await confirmIdentity()).toBe('confirmed');
    vi.mocked(LocalAuthentication.authenticateAsync).mockResolvedValueOnce({
      success: false,
      error: 'user_cancel',
    } as any);
    expect(await confirmIdentity()).toBe('cancelled');
  });

  it('falls back to the PIN when the person picks it or biometrics are gone', async () => {
    store.set('auth_method', 'biometric');
    await setPIN('1234');
    vi.mocked(LocalAuthentication.authenticateAsync).mockResolvedValueOnce({
      success: false,
      error: 'user_fallback',
    } as any);
    expect(await confirmIdentity()).toBe('needs-pin');
    vi.mocked(LocalAuthentication.hasHardwareAsync).mockResolvedValueOnce(false);
    expect(await confirmIdentity()).toBe('needs-pin');
  });
});
