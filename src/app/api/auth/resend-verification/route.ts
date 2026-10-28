import { NextResponse } from 'next/server';
import { createEmailVerification, getUserByEmail } from '@/lib/db';
import { getAppBaseUrl, isMailConfigured } from '@/lib/mail';
import { createToken, tokenExpiry } from '@/lib/tokens';
import { sendVerificationEmail } from '@/lib/verificationMail';
import { rateLimit } from '@/lib/rateLimit';
import { getRequestIp } from '@/lib/turnstile';

export const runtime = 'nodejs';

const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;

export async function POST(request: Request) {
  if (!isMailConfigured()) {
    return NextResponse.json({ error: 'Email is not configured' }, { status: 501 });
  }

  const ipLimit = rateLimit(`resend-verification:ip:${getRequestIp(request.headers) || 'unknown'}`, 5, 15 * 60 * 1000);
  if (!ipLimit.ok) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(ipLimit.retryAfter) } }
    );
  }

  const body = await request.json().catch(() => ({}));
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  // Always answer the same way so this cannot be used to discover registered emails.
  const emailLimit = rateLimit(`resend-verification:email:${email.toLowerCase()}`, 3, 60 * 60 * 1000);
  const user = emailLimit.ok ? getUserByEmail(email) : undefined;
  if (user && user.id !== 0 && user.email_verified !== 1) {
    const { token, tokenHash } = createToken();
    createEmailVerification(user.id, tokenHash, tokenExpiry(VERIFICATION_TTL_MS));
    sendVerificationEmail(user.email, `${getAppBaseUrl(request)}/verify-email?token=${token}`);
  }

  return NextResponse.json({ success: true });
}
