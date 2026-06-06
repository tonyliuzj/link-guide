import { notFound, redirect } from 'next/navigation';
import { createStat, getDomainByHostname, getLinkByShortCode, getSiteSettings } from '@/lib/db';
import { headers } from 'next/headers';
import { TurnstilePage } from '@/components/turnstilePage';
import { PasswordPage } from '@/components/passwordPage';
import { DelayedRedirectPage } from '@/components/delayedRedirectPage';
import { CustomPage } from '@/components/customPage';
import { getRequestHostname, getShortCodeFromPath } from '@/lib/domainUtils';
import { normalizeRedirectUrl } from '@/lib/redirectUrl';
import { isLinkExpired } from '@/lib/linkRules';

export const runtime = 'nodejs';

export default async function Page({ params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const headersList = await headers();
  const hostname = getRequestHostname(headersList);
  const domain = getDomainByHostname(hostname);

  if (!domain) {
    notFound();
  }

  const shortCode = getShortCodeFromPath(path, domain.base_path);
  if (!shortCode) {
    notFound();
  }

  const link = getLinkByShortCode(shortCode, domain.id);

  if (!link) {
    notFound();
  }

  if (isLinkExpired(link.expires_at)) {
    notFound();
  }

  const destinationUrl = normalizeRedirectUrl(link.destination_url);
  if (!destinationUrl) {
    notFound();
  }

  if (link.stats_enabled) {
    const ip = headersList.get('x-forwarded-for') || 'unknown';
    const userAgent = headersList.get('user-agent') || '';
    const referrer = headersList.get('referer') || '';
    createStat(link.id, ip, userAgent, referrer);
  }

  if (link.mode === 'simple') {
    if (link.turnstile_enabled === 1) {
      if (!domain.turnstile_site_key || !domain.turnstile_secret_key) {
        return <div className="p-8 text-center">Turnstile not configured for this domain</div>;
      }

      const siteSettings = getSiteSettings();
      return (
        <TurnstilePage
          siteKey={domain.turnstile_site_key}
          linkId={link.id}
          siteDomain={siteSettings?.site_domain || ''}
          redirectDelay={link.redirect_delay}
          allowSkipDelay={link.allow_skip === 1}
        />
      );
    }

    if (link.redirect_delay > 0) {
      return (
        <DelayedRedirectPage
          destinationUrl={destinationUrl}
          delay={link.redirect_delay}
          allowSkip={link.allow_skip === 1}
        />
      );
    }

    redirect(destinationUrl);
  }

  if (link.mode === 'custom_page') {
    const config = link.custom_page_config ? JSON.parse(link.custom_page_config) : {};

    if (link.turnstile_enabled === 1 && (!domain.turnstile_site_key || !domain.turnstile_secret_key)) {
      return <div className="p-8 text-center">Turnstile not configured for this domain</div>;
    }

    if (link.redirect_delay > 0 && link.turnstile_enabled !== 1) {
      return (
        <DelayedRedirectPage
          destinationUrl={destinationUrl}
          delay={link.redirect_delay}
          allowSkip={link.allow_skip === 1}
        />
      );
    }

    const siteSettings = getSiteSettings();
    return (
      <CustomPage
        config={config}
        destinationUrl={link.turnstile_enabled === 1 ? undefined : destinationUrl}
        linkId={link.id}
        siteDomain={siteSettings?.site_domain || ''}
        turnstileSiteKey={domain.turnstile_site_key}
        turnstileEnabled={link.turnstile_enabled === 1}
      />
    );
  }

  if (link.mode === 'password') {
    const siteSettings = getSiteSettings();
    return (
      <PasswordPage
        linkId={link.id}
        turnstileSiteKey={domain.turnstile_site_key}
        turnstileEnabled={link.turnstile_enabled === 1}
        siteDomain={siteSettings?.site_domain || ''}
      />
    );
  }

  if (link.mode === 'turnstile') {
    if (!domain.turnstile_site_key || !domain.turnstile_secret_key) {
      return <div className="p-8 text-center">Turnstile not configured for this domain</div>;
    }
    const siteSettings = getSiteSettings();
    return <TurnstilePage siteKey={domain.turnstile_site_key} linkId={link.id} siteDomain={siteSettings?.site_domain || ''} />;
  }

  redirect(destinationUrl);
}
