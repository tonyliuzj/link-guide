import { NextResponse } from 'next/server';
import { hashToken } from '@/lib/tokens';
import { hash } from 'bcryptjs';
import { rateLimit } from '@/lib/rateLimit';
import { isValidPassword } from '@/lib/validation';
import { getRequestIp } from '@/lib/turnstile';
import { deletePasswordResetsForUser, getValidPasswordReset, invalidateUserSessions, markEmailVerified, updatePassword } from '@/lib/db';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const limit = rateLimit(`reset:ip:${getRequestIp(request.headers) || 'unknown'}`, 10, 15 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'Too many attempts. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } }
    );
  }

  const body = await request.json().catch(() => ({}));
  const { token, password } = body;

  if (typeof token !== 'string' || typeof password !== 'string') {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  if (!isValidPassword(password)) {
    return NextResponse.json({ error: 'Password must be 8 to 128 characters' }, { status: 400 });
  }

  const reset = getValidPasswordReset(hashToken(token));
  if (!reset) {
    return NextResponse.json({ error: 'This reset link is invalid or has expired' }, { status: 400 });
  }

  updatePassword(reset.user_id, await hash(password, 10));
  deletePasswordResetsForUser(reset.user_id);
  invalidateUserSessions(reset.user_id);
  // Receiving the reset email proves the address is theirs.
  markEmailVerified(reset.user_id);
  return NextResponse.json({ success: true });
}
