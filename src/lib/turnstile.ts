export async function verifyTurnstileToken(
  token: string | undefined,
  secretKey: string | undefined,
  remoteIp?: string | null
) {
  if (!token || !secretKey) return false;

  try {
    const body = new URLSearchParams({
      secret: secretKey,
      response: token,
    });

    if (remoteIp) {
      body.set('remoteip', remoteIp);
    }

    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    const data = await response.json() as { success?: boolean };

    return data.success === true;
  } catch {
    return false;
  }
}

// Client-supplied X-Forwarded-For entries come first and can be forged; the proxy in front of the app
// appends the address it actually saw, so the last entry is the one to trust.
export function getRequestIp(headersList: { get(name: string): string | null }) {
  const forwarded = headersList.get('x-forwarded-for')?.split(',').map((part) => part.trim()).filter(Boolean);
  return headersList.get('cf-connecting-ip')
    || headersList.get('x-real-ip')
    || forwarded?.[forwarded.length - 1]
    || null;
}
