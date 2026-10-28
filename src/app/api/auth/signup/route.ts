import { NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { createEmailVerification, createUser, getSiteSettings, getUserByEmail } from '@/lib/db';
import { getAppBaseUrl, isMailConfigured } from '@/lib/mail';
import { sendVerificationEmail } from '@/lib/verificationMail';
import { createToken, tokenExpiry } from '@/lib/tokens';
import { getRequestIp, verifyTurnstileToken } from '@/lib/turnstile';
import { rateLimit } from '@/lib/rateLimit';
import { isValidEmail, isValidPassword } from '@/lib/validation';

const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;

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

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 });
  }
  if (!isValidPassword(password)) {
    return NextResponse.json({ error: 'Password must be 8 to 128 characters' }, { status: 400 });
  }

  try {
    const passwordHash = await hash(password, 10);
    // With SMTP configured, new accounts must confirm their address before they can log in.
    const verificationRequired = isMailConfigured();
    createUser(email, passwordHash, 'user', !verificationRequired);

    if (verificationRequired) {
      const user = getUserByEmail(email);
      if (user) {
        const { token, tokenHash } = createToken();
        createEmailVerification(user.id, tokenHash, tokenExpiry(VERIFICATION_TTL_MS));
        sendVerificationEmail(user.email, `${getAppBaseUrl(request)}/verify-email?token=${token}`);
      }
    }

    return NextResponse.json({ success: true, verificationRequired });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (message.includes('UNIQUE constraint failed')) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
