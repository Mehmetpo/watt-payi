import { SecureStorage } from '@aparajita/capacitor-secure-storage';

const NONCE_KEY = 'pending_recovery_nonce';
// Generous enough to switch to the email app and back, tight enough that a
// captured old nonce isn't useful for long.
const NONCE_TTL_MS = 15 * 60 * 1000;

function randomNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

// Called right before requesting a password-reset email. The custom URI
// scheme the reset link comes back through (com.mehmetcebe.wattpayi://...,
// see AndroidManifest.xml) isn't exclusive to this app — Android lets any
// installed app register the same scheme+host. Binding the callback to a
// nonce that only ever exists in this device's secure storage means a token
// pair delivered to a different app (or replayed from an old email) can't
// be turned into a session here just by matching the URL shape.
export async function beginRecoveryRequest(): Promise<string> {
  const nonce = randomNonce();
  await SecureStorage.set(NONCE_KEY, JSON.stringify({ nonce, expiresAt: Date.now() + NONCE_TTL_MS }));
  return nonce;
}

// One-time check: always consumes (clears) the pending nonce, then reports
// whether `candidate` matched an unexpired, locally-issued request. Clearing
// unconditionally means a mismatched or replayed callback can't be retried
// against a still-pending nonce.
export async function consumeRecoveryNonce(candidate: string | null): Promise<boolean> {
  let stored: { nonce: string; expiresAt: number } | null = null;
  try {
    const raw = await SecureStorage.get(NONCE_KEY);
    stored = raw === null ? null : JSON.parse(String(raw));
  } catch {
    stored = null;
  }
  await SecureStorage.remove(NONCE_KEY).catch(() => {});
  if (!stored || !candidate) return false;
  if (Date.now() > stored.expiresAt) return false;
  return stored.nonce === candidate;
}
