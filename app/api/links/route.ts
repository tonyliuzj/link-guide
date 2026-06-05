import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createLink, getLinksByUserId, getAllLinks, linkExists, isBlacklisted } from '@/lib/db';
import { hash } from 'bcryptjs';
import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 7);

async function generateUniqueShortCode(domainId: number): Promise<string> {
  let code = nanoid();
  while (linkExists(code, domainId)) {
    code = nanoid();
  }
  return code;
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { destinationUrl, domainId, shortCode, mode, password, customPageConfig, statsEnabled } = body;

  if (!destinationUrl || !domainId || !mode) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    const finalShortCode = shortCode || await generateUniqueShortCode(domainId);

    if (shortCode && isBlacklisted(shortCode)) {
      return NextResponse.json({ error: 'This path is not allowed' }, { status: 400 });
    }

    if (shortCode && linkExists(shortCode, domainId)) {
      return NextResponse.json({ error: 'Link already taken' }, { status: 400 });
    }

    const linkData: any = {
      shortCode: finalShortCode,
      destinationUrl,
      domainId,
      userId: parseInt(session.user.id),
      mode,
      statsEnabled: statsEnabled ?? true,
    };

    if (mode === 'password' && password) {
      linkData.passwordHash = await hash(password, 10);
    }

    if (mode === 'custom_page' && customPageConfig) {
      linkData.customPageConfig = JSON.stringify(customPageConfig);
    }

    createLink(linkData);
    return NextResponse.json({ success: true, shortCode: finalShortCode });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const links = session.user.role === 'admin'
    ? getAllLinks()
    : getLinksByUserId(parseInt(session.user.id));
  return NextResponse.json(links);
}
