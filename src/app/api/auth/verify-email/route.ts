import { NextResponse } from 'next/server';
import { consumeEmailVerification } from '@/lib/db';
import { hashToken } from '@/lib/tokens';
import { rateLimit } from '@/lib/rateLimit';
import { getRequestIp } from '@/lib/turnstile';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const limit = rateLimit(`verify-email:ip:${getRequestIp(request.headers) || 'unknown'}`, 10, 15 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'Too many attempts. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } }
    );
  }

  const body = await request.json().catch(() => ({}));
  if (typeof body.token !== 'string' || !body.token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 });
  }

  const result = consumeEmailVerification(hashToken(body.token));
  if (result === 'taken') {
    return NextResponse.json({ error: 'That email address is already used by another account' }, { status: 409 });
  }
  if (result === 'invalid') {
    return NextResponse.json({ error: 'This verification link is invalid or has expired' }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
