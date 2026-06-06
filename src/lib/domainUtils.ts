export function normalizeDomain(value: unknown) {
  if (typeof value !== 'string') return '';

  let domain = value.trim().toLowerCase();
  if (!domain) return '';

  domain = domain.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '');
  domain = domain.replace(/^[^@/]+@/, '');
  domain = domain.split(/[/?#]/)[0] || '';
  domain = domain.replace(/:(80|443)$/, '');
  domain = domain.replace(/\.+$/, '');

  return domain;
}

export function normalizeBasePath(value: unknown) {
  if (typeof value !== 'string') return '/';

  let basePath = value.trim();
  if (!basePath) return '/';

  basePath = basePath.split(/[?#]/)[0] || '/';
  if (!basePath.startsWith('/')) {
    basePath = `/${basePath}`;
  }

  basePath = basePath.replace(/\/+/g, '/').replace(/\/+$/, '');
  return basePath || '/';
}

function withoutPort(hostname: string) {
  if (hostname.startsWith('[')) {
    const end = hostname.indexOf(']');
    return end === -1 ? hostname : hostname.slice(0, end + 1);
  }

  const colonCount = (hostname.match(/:/g) || []).length;
  if (colonCount !== 1) return hostname;

  return hostname.replace(/:\d+$/, '');
}

function withWwwVariant(hostname: string) {
  if (!hostname) return [];
  if (hostname.startsWith('www.')) return [hostname.slice(4)];
  return [`www.${hostname}`];
}

export function getHostnameCandidates(value: unknown) {
  const normalized = normalizeDomain(value);
  if (!normalized) return [];

  const portless = withoutPort(normalized);
  const candidates = [
    normalized,
    portless,
    ...withWwwVariant(normalized),
    ...withWwwVariant(portless),
  ];

  return Array.from(new Set(candidates.filter(Boolean)));
}

export function getRequestHostname(headersList: { get(name: string): string | null }) {
  if (process.env.AUTH_TRUST_HOST === 'true') {
    const forwardedHost = headersList.get('x-forwarded-host')?.split(',')[0]?.trim();
    if (forwardedHost) return forwardedHost;
  }

  return headersList.get('host') || '';
}

export function getShortCodeFromPath(segments: string[], basePathValue: unknown) {
  const basePath = normalizeBasePath(basePathValue);
  const baseSegments = basePath === '/' ? [] : basePath.slice(1).split('/');

  if (segments.length !== baseSegments.length + 1) {
    return null;
  }

  for (let index = 0; index < baseSegments.length; index += 1) {
    if (segments[index] !== baseSegments[index]) {
      return null;
    }
  }

  return segments[segments.length - 1] || null;
}

export function buildShortUrl(domain: string, basePath: string, shortCode: string) {
  const normalizedDomain = normalizeDomain(domain);
  const normalizedBasePath = normalizeBasePath(basePath);
  const pathPrefix = normalizedBasePath === '/' ? '' : normalizedBasePath;
  return `${normalizedDomain}${pathPrefix}/${shortCode}`;
}
