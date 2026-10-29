import { sendMail } from '@/lib/mail';

export function sendEmailChangeEmail(to: string, link: string) {
  sendMail(
    to,
    'Confirm your new email address',
    `Confirm this address to use it for your account. This link expires in 24 hours.\n\n${link}\n\nIf you did not ask to change your email, you can ignore this message.`
  ).catch((error) => {
    console.error('Failed to send email change confirmation:', error);
  });
}

// Sent instead of an error when someone signs up with an address that already has an account, so the
// signup form cannot be used to find out which addresses are registered.
export function sendAccountExistsEmail(to: string, loginUrl: string, resetUrl: string) {
  sendMail(
    to,
    'You already have an account',
    `Someone (hopefully you) tried to create an account with this email address, but one already exists.\n\nLog in: ${loginUrl}\nForgot your password? ${resetUrl}\n\nIf this was not you, you can ignore this email.`
  ).catch((error) => {
    console.error('Failed to send account-exists email:', error);
  });
}

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
