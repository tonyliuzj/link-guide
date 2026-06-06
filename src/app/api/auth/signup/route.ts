import { NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { createUser, getSiteSettings } from '@/lib/db';
import { getRequestIp, verifyTurnstileToken } from '@/lib/turnstile';

export async function POST(request: Request) {
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
  } catch (error: any) {
    if (error.message?.includes('UNIQUE constraint failed')) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
