import { NextResponse } from 'next/server';
import { createPasswordReset, getUserByEmail } from '@/lib/db';
import { getAppBaseUrl, isMailConfigured, sendMail } from '@/lib/mail';
import { createToken, tokenExpiry } from '@/lib/tokens';
import { rateLimit } from '@/lib/rateLimit';
import { getRequestIp } from '@/lib/turnstile';

export const runtime = 'nodejs';

const TOKEN_TTL_MS = 60 * 60 * 1000;
const IP_LIMIT = 5;
const EMAIL_LIMIT = 3;
const IP_WINDOW_MS = 15 * 60 * 1000;
const EMAIL_WINDOW_MS = 60 * 60 * 1000;

export async function POST(request: Request) {
  if (!isMailConfigured()) {
    return NextResponse.json({ error: 'Password reset by email is not configured' }, { status: 501 });
  }

  const ipLimit = rateLimit(`forgot:ip:${getRequestIp(request.headers) || 'unknown'}`, IP_LIMIT, IP_WINDOW_MS);
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

  // Always answer the same way so the endpoint cannot be used to discover registered emails.
  // Per-address limit is silent too, so it cannot be used to probe for accounts or to mail-bomb one inbox.
  const emailLimit = rateLimit(`forgot:email:${email.toLowerCase()}`, EMAIL_LIMIT, EMAIL_WINDOW_MS);
  const user = emailLimit.ok ? getUserByEmail(email) : undefined;
  if (user && user.id !== 0) {
    const { token, tokenHash } = createToken();
    createPasswordReset(user.id, tokenHash, tokenExpiry(TOKEN_TTL_MS));

    const link = `${getAppBaseUrl(request)}/reset-password?token=${token}`;
    // Not awaited: delivery time must not reveal whether the address belongs to an account.
    sendMail(
      user.email,
      'Reset your password',
      `Use the link below to reset your password. It expires in 1 hour.\n\n${link}\n\nIf you did not request this, you can ignore this email.`
    ).catch((error) => {
      console.error('Failed to send password reset email:', error);
    });
  }

  return NextResponse.json({ success: true });
}
