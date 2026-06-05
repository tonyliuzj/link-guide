import { notFound, redirect } from 'next/navigation';
import { createStat, getDomainByHostname, getLinkByShortCode } from '@/lib/db';
import { headers } from 'next/headers';
import { TurnstilePage } from '@/components/turnstile-page';
import { PasswordPage } from '@/components/password-page';
import { DelayedRedirectPage } from '@/components/delayed-redirect-page';
import { CustomPage } from '@/components/custom-page';
import { getRequestHostname, getShortCodeFromPath } from '@/lib/domain-utils';

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

  if (link.stats_enabled) {
    const ip = headersList.get('x-forwarded-for') || 'unknown';
    const userAgent = headersList.get('user-agent') || '';
    const referrer = headersList.get('referer') || '';
    createStat(link.id, ip, userAgent, referrer);
  }

  if (link.mode === 'simple') {
    if (link.turnstile_enabled === 1 && domain.turnstile_site_key) {
      return (
        <TurnstilePage
          siteKey={domain.turnstile_site_key}
          destinationUrl={link.destination_url}
          allowSkip={false}
        />
      );
    }

    if (link.redirect_delay > 0) {
      return (
        <DelayedRedirectPage
          destinationUrl={link.destination_url}
          delay={link.redirect_delay}
          allowSkip={link.allow_skip === 1}
        />
      );
    }

    redirect(link.destination_url);
  }

  if (link.mode === 'custom_page') {
    const config = link.custom_page_config ? JSON.parse(link.custom_page_config) : {};

    if (link.redirect_delay > 0 && link.turnstile_enabled !== 1) {
      return (
        <DelayedRedirectPage
          destinationUrl={link.destination_url}
          delay={link.redirect_delay}
          allowSkip={link.allow_skip === 1}
        />
      );
    }

    return (
      <CustomPage
        config={config}
        destinationUrl={link.destination_url}
        turnstileSiteKey={domain.turnstile_site_key}
        turnstileEnabled={link.turnstile_enabled === 1}
      />
    );
  }

  if (link.mode === 'password') {
    return (
      <PasswordPage
        linkId={link.id}
        turnstileSiteKey={domain.turnstile_site_key}
        turnstileEnabled={link.turnstile_enabled === 1}
      />
    );
  }

  if (link.mode === 'turnstile') {
    if (!domain.turnstile_site_key) {
      return <div className="p-8 text-center">Turnstile not configured for this domain</div>;
    }
    return <TurnstilePage siteKey={domain.turnstile_site_key} destinationUrl={link.destination_url} />;
  }

  redirect(link.destination_url);
}
