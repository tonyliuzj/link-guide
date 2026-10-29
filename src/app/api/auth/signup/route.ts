import { NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { createEmailVerification, createUser, getSiteSettings, getUserByEmail } from '@/lib/db';
import { getAppBaseUrl, isMailConfigured } from '@/lib/mail';
import { sendAccountExistsEmail, sendVerificationEmail } from '@/lib/verificationMail';
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

  const body = await request.json().catch(() => ({}));
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

  // Hash first so the response time is the same whether or not the address is already registered.
  const passwordHash = await hash(password, 10);
  // With SMTP configured, new accounts must confirm their address before they can log in.
  const verificationRequired = isMailConfigured();
  const baseUrl = getAppBaseUrl(request);

  try {
    const existing = getUserByEmail(email);

    if (existing && verificationRequired) {
      // Answer exactly like a fresh signup and tell the address owner by email instead.
      if (rateLimit(`signup:email:${existing.email}`, 3, 60 * 60 * 1000).ok && existing.id !== 0) {
        if (existing.email_verified === 1) {
          sendAccountExistsEmail(existing.email, `${baseUrl}/login`, `${baseUrl}/forgot-password`);
        } else {
          const { token, tokenHash } = createToken();
          createEmailVerification(existing.id, tokenHash, tokenExpiry(VERIFICATION_TTL_MS));
          sendVerificationEmail(existing.email, `${baseUrl}/verify-email?token=${token}`);
        }
      }
      return NextResponse.json({ success: true, verificationRequired });
    }

    if (existing) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
    }

    createUser(email, passwordHash, 'user', !verificationRequired);

    if (verificationRequired) {
      const user = getUserByEmail(email);
      if (user) {
        const { token, tokenHash } = createToken();
        createEmailVerification(user.id, tokenHash, tokenExpiry(VERIFICATION_TTL_MS));
        sendVerificationEmail(user.email, `${baseUrl}/verify-email?token=${token}`);
      }
    }

    return NextResponse.json({ success: true, verificationRequired });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (message.includes('UNIQUE constraint failed')) {
      // Lost a race with another signup for the same address.
      return verificationRequired
        ? NextResponse.json({ success: true, verificationRequired })
        : NextResponse.json({ error: 'Email already exists' }, { status: 400 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
