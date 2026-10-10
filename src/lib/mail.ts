import nodemailer from 'nodemailer';

export function isMailConfigured() {
  return !!(process.env.SMTP_HOST && process.env.SMTP_FROM);
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
