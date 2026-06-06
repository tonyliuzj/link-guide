import { normalizeDomain } from './domainUtils';

export function getSiteApiUrl(path: string, siteDomain?: string | null) {
  const apiPath = path.startsWith('/') ? path : `/${path}`;
  const domain = normalizeDomain(siteDomain || '');

  if (!domain || typeof window === 'undefined') {
    return apiPath;
  }

  if (normalizeDomain(window.location.host) === domain) {
    return apiPath;
  }

  const protocol = domain.startsWith('localhost') || domain.startsWith('127.0.0.1')
    ? window.location.protocol
    : 'https:';

  return `${protocol}//${domain}${apiPath}`;
}
