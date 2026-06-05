import { NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { createUser, createDomain, completeSetup, isSetupCompleted } from '@/lib/db';

export async function POST(request: Request) {
  if (isSetupCompleted()) {
    return NextResponse.json({ error: 'Setup already completed' }, { status: 400 });
  }

  const body = await request.json();
  const { email, password, domain, basePath } = body;

  if (!email || !password || !domain) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    const passwordHash = await hash(password, 10);
    createUser(email, passwordHash, 'admin');
    createDomain(domain, basePath || '/');
    completeSetup();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
