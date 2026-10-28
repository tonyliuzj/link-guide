import { NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { isValidEmail, isValidPassword } from '@/lib/validation';
import { createUser, createDomain, completeSetup, isSetupCompleted, getSiteSettings, updateSiteSettings } from '@/lib/db';

export async function POST(request: Request) {
  if (isSetupCompleted()) {
    return NextResponse.json({ error: 'Setup already completed' }, { status: 400 });
  }

  const body = await request.json();
  const { email, password, domain, basePath } = body;

  if (!email || !password || !domain) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 });
  }
  if (!isValidPassword(password)) {
    return NextResponse.json({ error: 'Password must be 8 to 128 characters' }, { status: 400 });
  }

  try {
    const passwordHash = await hash(password, 10);
    createUser(email, passwordHash, 'admin');
    createDomain(domain, basePath || '/');
    const siteTitle = getSiteSettings()?.site_title || 'LinkGuide';
    updateSiteSettings(siteTitle, domain);
    completeSetup();

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
