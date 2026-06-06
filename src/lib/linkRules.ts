const SHORT_CODE_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
const MAX_REDIRECT_DELAY_SECONDS = 24 * 60 * 60;

const LINK_MODES = new Set(['simple', 'custom_page', 'password']);

export type LinkMode = 'simple' | 'custom_page' | 'password';

export function normalizeLinkMode(value: unknown): LinkMode | null {
  if (typeof value !== 'string') return null;
  return LINK_MODES.has(value) ? value as LinkMode : null;
}

export function normalizeShortCode(value: unknown) {
  if (typeof value !== 'string') return null;

  const shortCode = value.trim();
  return SHORT_CODE_PATTERN.test(shortCode) ? shortCode : null;
}

export function normalizeRedirectDelay(value: unknown) {
  const delay = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(delay) || delay < 0 || delay > MAX_REDIRECT_DELAY_SECONDS) {
    return null;
  }

  return delay;
}

export function normalizeExpiresAt(value: unknown) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') return null;

  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return null;

  return new Date(timestamp).toISOString();
}

export function isLinkExpired(expiresAt: unknown) {
  if (!expiresAt) return false;
  if (typeof expiresAt !== 'string') return true;

  const timestamp = Date.parse(expiresAt);
  return Number.isNaN(timestamp) || timestamp <= Date.now();
}
