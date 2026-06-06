import { NextRequest, NextResponse } from 'next/server';
import { getDomainByHostname, getSiteSettings } from './src/lib/db';
import { getRequestHostname, normalizeDomain } from './src/lib/domainUtils';

export function proxy(request: NextRequest) {
  const hostname = getRequestHostname(request.headers);
  const domain = getDomainByHostname(hostname);

  if (!domain || domain.base_response !== '444') {
    return NextResponse.next();
  }

  const siteSettings = getSiteSettings();
  const isSiteDomain = !!siteSettings?.site_domain
    && normalizeDomain(siteSettings.site_domain) === normalizeDomain(domain.domain);

  if (isSiteDomain) {
    return NextResponse.next();
  }

  return new Response(null, {
    status: 444,
    headers: { Connection: 'close' },
  });
}

export const config = {
  matcher: '/',
};
