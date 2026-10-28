import nodemailer from 'nodemailer';
import { getSiteSettings } from '@/lib/db';
import { normalizeDomain } from '@/lib/domainUtils';

export function isMailConfigured() {
  return !!(process.env.SMTP_HOST && process.env.SMTP_FROM);
}

// Base URL for links in emails. Prefer configuration over the request so a spoofed Host header
// cannot poison the emailed link.
export function getAppBaseUrl(request: Request) {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/+$/, '');

  const domain = normalizeDomain(getSiteSettings()?.site_domain || '');
  if (domain) {
    const local = domain.startsWith('localhost') || domain.startsWith('127.0.0.1');
    return `${local ? 'http' : 'https'}://${domain}`;
  }
  return new URL(request.url).origin;
}

export async function sendMail(to: string, subject: string, text: string) {
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : port === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
      : undefined,
  });

  await transport.sendMail({ from: process.env.SMTP_FROM, to, subject, text });
}
