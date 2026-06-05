import { notFound, redirect } from 'next/navigation';
import { getLinkByShortCode, getDomainByHostname, createStat } from '@/lib/db';
import { headers } from 'next/headers';
import { TurnstilePage } from '@/components/turnstile-page';
import { PasswordPage } from '@/components/password-page';
import { DelayedRedirectPage } from '@/components/delayed-redirect-page';
import { CustomPage } from '@/components/custom-page';
import { Footer } from '@/components/footer';

export const runtime = 'nodejs';

export default async function Page({ params }: { params: Promise<{ shortCode: string }> }) {
  const { shortCode } = await params;
  const headersList = await headers();
  const hostname = headersList.get('host') || '';
  const domain = getDomainByHostname(hostname);

  if (!domain) {
    return notFound();
  }

  const link = getLinkByShortCode(shortCode, domain.id);

  if (!link) {
    return notFound();
  }

  if (link.stats_enabled) {
    const ip = headersList.get('x-forwarded-for') || 'unknown';
    const userAgent = headersList.get('user-agent') || '';
    const referrer = headersList.get('referer') || '';
    createStat(link.id, ip, userAgent, referrer);
  }

  if (link.mode === 'simple') {
    // If Turnstile is enabled and domain has it configured
    if (link.turnstile_enabled === 1 && domain.turnstile_site_key) {
      return <TurnstilePage siteKey={domain.turnstile_site_key} destinationUrl={link.destination_url} allowSkip={link.allow_skip === 1} />
    }
    // If redirect delay is set
    if (link.redirect_delay > 0) {
      return <DelayedRedirectPage destinationUrl={link.destination_url} delay={link.redirect_delay} allowSkip={link.allow_skip === 1} />
    }
    // Immediate redirect
    redirect(link.destination_url);
  }

  if (link.mode === 'custom_page') {
    const config = link.custom_page_config ? JSON.parse(link.custom_page_config) : {};

    // If redirect delay is set (without turnstile)
    if (link.redirect_delay > 0 && link.turnstile_enabled !== 1) {
      return <DelayedRedirectPage destinationUrl={link.destination_url} delay={link.redirect_delay} allowSkip={link.allow_skip === 1} />
    }

    // Custom page with optional turnstile
    return <CustomPage
      config={config}
      destinationUrl={link.destination_url}
      turnstileSiteKey={domain.turnstile_site_key}
      turnstileEnabled={link.turnstile_enabled === 1}
    />
  }

  if (link.mode === 'password') {
    return <PasswordPage linkId={link.id} turnstileSiteKey={domain.turnstile_site_key} turnstileEnabled={link.turnstile_enabled === 1} />
  }

  if (link.mode === 'turnstile') {
    if (!domain.turnstile_site_key) {
      return <div className="p-8 text-center">Turnstile not configured for this domain</div>
    }
    return <TurnstilePage siteKey={domain.turnstile_site_key} destinationUrl={link.destination_url} />
  }

  redirect(link.destination_url);
}
