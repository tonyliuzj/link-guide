import { sendMail } from '@/lib/mail';

// Not awaited by callers: delivery time must not reveal whether an address has an account.
export function sendVerificationEmail(to: string, link: string) {
  sendMail(
    to,
    'Verify your email address',
    `Confirm your email address to finish creating your account. This link expires in 24 hours.\n\n${link}\n\nIf you did not sign up, you can ignore this email.`
  ).catch((error) => {
    console.error('Failed to send verification email:', error);
  });
}
