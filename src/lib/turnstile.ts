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

export function getRequestIp(headersList: { get(name: string): string | null }) {
  return headersList.get('x-forwarded-for')?.split(',')[0]?.trim()
    || headersList.get('x-real-ip')
    || null;
}
