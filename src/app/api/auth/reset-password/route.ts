import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { hash } from 'bcryptjs';
import { deletePasswordResetsForUser, getValidPasswordReset, updatePassword } from '@/lib/db';

export const runtime = 'nodejs';

export async function POST(request: Request) {
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
  return NextResponse.json({ success: true });
}
