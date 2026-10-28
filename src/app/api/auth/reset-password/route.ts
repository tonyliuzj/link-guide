import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { hash } from 'bcryptjs';
import { rateLimit } from '@/lib/rateLimit';
import { getRequestIp } from '@/lib/turnstile';
import { deletePasswordResetsForUser, getValidPasswordReset, invalidateUserSessions, updatePassword } from '@/lib/db';

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
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }

  const reset = getValidPasswordReset(createHash('sha256').update(token).digest('hex'));
  if (!reset) {
    return NextResponse.json({ error: 'This reset link is invalid or has expired' }, { status: 400 });
  }

  updatePassword(reset.user_id, await hash(password, 10));
  deletePasswordResetsForUser(reset.user_id);
  invalidateUserSessions(reset.user_id);
  return NextResponse.json({ success: true });
}
