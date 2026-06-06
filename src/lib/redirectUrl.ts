const ALLOWED_REDIRECT_PROTOCOLS = new Set(['http:', 'https:']);

export function normalizeRedirectUrl(value: unknown) {
  if (typeof value !== 'string') return null;

  const input = value.trim();
  if (!input) return null;

  try {
    const url = new URL(input);
    if (!ALLOWED_REDIRECT_PROTOCOLS.has(url.protocol) || !url.hostname) {
      return null;
    }

    return url.href;
  } catch {
    return null;
  }
}

export function isValidRedirectUrl(value: unknown) {
  return normalizeRedirectUrl(value) !== null;
}
