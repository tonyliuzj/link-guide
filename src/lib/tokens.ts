import { createHash, randomBytes } from 'crypto';

// Emailed tokens are random; only the SHA-256 hash is stored.
export function createToken() {
  const token = randomBytes(32).toString('hex');
  return { token, tokenHash: hashToken(token) };
}

export function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export function tokenExpiry(ttlMs: number) {
  return new Date(Date.now() + ttlMs).toISOString().replace('T', ' ').slice(0, 19);
}
