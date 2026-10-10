import { NextResponse } from 'next/server';
import { createHash, randomBytes } from 'crypto';
import { createPasswordReset, getSiteSettings, getUserByEmail } from '@/lib/db';
import { isMailConfigured, sendMail } from '@/lib/mail';
import { normalizeDomain } from '@/lib/domainUtils';

export const runtime = 'nodejs';

const TOKEN_TTL_MS = 60 * 60 * 1000;

function getBaseUrl(request: Request) {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/+$/, '');

  // Prefer the configured site domain so a spoofed Host header cannot poison the emailed link.
  const domain = normalizeDomain(getSiteSettings()?.site_domain || '');
  if (domain) {
    const local = domain.startsWith('localhost') || domain.startsWith('127.0.0.1');
    return `${local ? 'http' : 'https'}://${domain}`;
  }
  return new URL(request.url).origin;
}

export async function POST(request: Request) {
  if (!isMailConfigured()) {
    return NextResponse.json({ error: 'Password reset by email is not configured' }, { status: 501 });
  }

  const body = await request.json().catch(() => ({}));
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  // Always answer the same way so the endpoint cannot be used to discover registered emails.
  const user = getUserByEmail(email);
  if (user && user.id !== 0) {
    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString().replace('T', ' ').slice(0, 19);
    createPasswordReset(user.id, tokenHash, expiresAt);

    const link = `${getBaseUrl(request)}/reset-password?token=${token}`;
    try {
      await sendMail(
        user.email,
        'Reset your password',
        `Use the link below to reset your password. It expires in 1 hour.\n\n${link}\n\nIf you did not request this, you can ignore this email.`
      );
    } catch (error) {
      console.error('Failed to send password reset email:', error);
    }
  }

  return NextResponse.json({ success: true });
}
