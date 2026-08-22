/**
 * Credential digests.
 *
 * There is no server in this repository, so accounts live in the browser — but
 * "no server" is not a reason to keep a password readable. Everything secret is
 * stored as a salted SHA-256 digest via Web Crypto, so reading localStorage
 * yields no usable credential, and two accounts that share a password do not
 * share a hash.
 *
 * SHA-256 is a digest, not a password-stretching function: a real deployment
 * puts this behind an identity service doing Argon2/bcrypt server-side. The
 * shape here — salt per user, hash on write, compare digests on read — is the
 * same one that swap needs, so only this file changes.
 */

const encoder = new TextEncoder();

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** 16 random bytes, hex encoded. */
export function createSalt(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function createId(): string {
  return `u-${createSalt().slice(0, 12)}`;
}

/** Salted digest of a secret. */
export async function hashSecret(secret: string, salt: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(`${salt}:${secret}`));
  return toHex(digest);
}

/**
 * Constant-time-ish comparison. Both operands are fixed-length hex digests, so
 * this is mostly hygiene, but it costs nothing and keeps the habit intact.
 */
export function digestsMatch(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Answers are compared as people retype them, not as they first typed them:
 * case, surrounding space and doubled inner spaces must not matter, or the
 * recovery flow becomes a second way to lose an account.
 */
export function normaliseAnswer(answer: string): string {
  return answer.trim().toLowerCase().replace(/\s+/g, " ");
}

export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}
