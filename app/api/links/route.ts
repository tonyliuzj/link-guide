import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createLink, getLinksByUserId, getAllLinks, linkExists, isBlacklisted, getDomainById } from '@/lib/db';
import { hash } from 'bcryptjs';
import { customAlphabet } from 'nanoid';
import { normalizeRedirectUrl } from '@/lib/redirect-url';
import { normalizeExpiresAt, normalizeLinkMode, normalizeRedirectDelay, normalizeShortCode } from '@/lib/link-rules';

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 7);

async function generateUniqueShortCode(domainId: number): Promise<string> {
  let code = nanoid();
  while (linkExists(code, domainId) || isBlacklisted(code)) {
    code = nanoid();
  }
  return code;
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { destinationUrl, domainId, shortCode, mode, password, customPageConfig, statsEnabled, redirectDelay, allowSkip, turnstileEnabled, expiresAt } = body;

  if (!destinationUrl || !domainId || !mode) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const parsedDomainId = Number(domainId);
  if (!Number.isInteger(parsedDomainId) || parsedDomainId <= 0) {
    return NextResponse.json({ error: 'Domain not found' }, { status: 400 });
  }

  const effectiveMode = mode === 'turnstile' ? 'simple' : normalizeLinkMode(mode);
  if (!effectiveMode) {
    return NextResponse.json({ error: 'Invalid redirect mode' }, { status: 400 });
  }

  const normalizedRedirectDelay = normalizeRedirectDelay(redirectDelay ?? 0);
  if (normalizedRedirectDelay === null) {
    return NextResponse.json({ error: 'Redirect delay must be a whole number between 0 and 86400 seconds' }, { status: 400 });
  }

  const normalizedExpiresAt = normalizeExpiresAt(expiresAt);
  if (expiresAt && !normalizedExpiresAt) {
    return NextResponse.json({ error: 'Expiration date is invalid' }, { status: 400 });
  }

  const normalizedDestinationUrl = normalizeRedirectUrl(destinationUrl);
  if (!normalizedDestinationUrl) {
    return NextResponse.json({ error: 'Destination URL must be an absolute http or https URL' }, { status: 400 });
  }

  const normalizedShortCode = shortCode ? normalizeShortCode(shortCode) : null;
  if (shortCode && !normalizedShortCode) {
    return NextResponse.json({ error: 'Short code can only contain letters, numbers, hyphens, and underscores' }, { status: 400 });
  }

  if (effectiveMode === 'password' && !password) {
    return NextResponse.json({ error: 'Password is required for password-protected links' }, { status: 400 });
  }

  try {
    const finalShortCode = normalizedShortCode || await generateUniqueShortCode(parsedDomainId);
    const domain = getDomainById(parsedDomainId);
    const effectiveTurnstileEnabled = turnstileEnabled || mode === 'turnstile';

    if (!domain) {
      return NextResponse.json({ error: 'Domain not found' }, { status: 400 });
    }

    if (effectiveTurnstileEnabled && (!domain?.turnstile_site_key || !domain?.turnstile_secret_key)) {
      return NextResponse.json({ error: 'Turnstile is not configured for this domain' }, { status: 400 });
    }

    if (isBlacklisted(finalShortCode)) {
      return NextResponse.json({ error: 'This path is not allowed' }, { status: 400 });
    }

    if (normalizedShortCode && linkExists(normalizedShortCode, parsedDomainId)) {
      return NextResponse.json({ error: 'Link already taken' }, { status: 400 });
    }

    const linkData: any = {
      shortCode: finalShortCode,
      destinationUrl: normalizedDestinationUrl,
      domainId: parsedDomainId,
      userId: parseInt(session.user.id),
      mode: effectiveMode,
      statsEnabled: statsEnabled ?? true,
      redirectDelay: normalizedRedirectDelay,
      allowSkip: allowSkip ?? true,
      turnstileEnabled: effectiveTurnstileEnabled,
      expiresAt: normalizedExpiresAt,
    };

    if (effectiveMode === 'password' && password) {
      linkData.passwordHash = await hash(password, 10);
    }

    if (effectiveMode === 'custom_page' && customPageConfig) {
      linkData.customPageConfig = JSON.stringify(customPageConfig);
    }

    createLink(linkData);
    return NextResponse.json({ success: true, shortCode: finalShortCode });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const links = session.user.role === 'admin'
    ? getAllLinks()
    : getLinksByUserId(parseInt(session.user.id));
  return NextResponse.json(links);
}
