import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getAllDomains, createDomain, domainExists } from '@/lib/db';
import { normalizeRedirectUrl } from '@/lib/redirect-url';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const domains = getAllDomains();
  return NextResponse.json(domains);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { domain, basePath, isActive, allowGuestCreate, turnstileSiteKey, turnstileSecretKey, baseResponse, baseRedirectUrl } = body;

  if (!domain) {
    return NextResponse.json({ error: 'Missing domain' }, { status: 400 });
  }

  if (domainExists(domain)) {
    return NextResponse.json({ error: 'Domain already exists' }, { status: 400 });
  }

  let normalizedBaseRedirectUrl: string | null = null;
  if (baseResponse === 'redirect') {
    normalizedBaseRedirectUrl = normalizeRedirectUrl(baseRedirectUrl);
    if (!normalizedBaseRedirectUrl) {
      return NextResponse.json({ error: 'Redirect URL must be an absolute http or https URL' }, { status: 400 });
    }
  }

  try {
    createDomain(
      domain,
      basePath || '/',
      isActive,
      allowGuestCreate,
      turnstileSiteKey,
      turnstileSecretKey,
      baseResponse,
      normalizedBaseRedirectUrl
    );
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
