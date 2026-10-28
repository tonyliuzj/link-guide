import { NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { createUser, getSiteSettings } from '@/lib/db';
import { getRequestIp, verifyTurnstileToken } from '@/lib/turnstile';
import { rateLimit } from '@/lib/rateLimit';

export async function POST(request: Request) {
  const limit = rateLimit(`signup:ip:${getRequestIp(request.headers) || 'unknown'}`, 10, 60 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'Too many sign-up attempts. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } }
    );
  }

  const body = await request.json();
  const { email, password, turnstileToken } = body;

  if (!email || !password) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const siteSettings = getSiteSettings();
  if (siteSettings?.turnstile_signup === 1) {
    const isVerified = await verifyTurnstileToken(
      turnstileToken,
      siteSettings.turnstile_secret_key,
      getRequestIp(request.headers)
    );

    if (!isVerified) {
      return NextResponse.json({ error: 'Verification failed' }, { status: 400 });
    }
  }

  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }

  try {
    const passwordHash = await hash(password, 10);
    createUser(email, passwordHash, 'user');
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (message.includes('UNIQUE constraint failed')) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
