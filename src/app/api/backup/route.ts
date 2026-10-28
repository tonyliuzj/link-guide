import { NextResponse } from 'next/server';
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { auth } from '@/lib/auth';
import { backupDatabase, restoreDatabase, validateBackupFile } from '@/lib/db';
import { rateLimit } from '@/lib/rateLimit';

export const runtime = 'nodejs';

const MAX_BACKUP_BYTES = 500 * 1024 * 1024;

async function requireAdmin() {
  const session = await auth();
  return !!session?.user?.id && session.user.role === 'admin';
}

// Download a snapshot of the database. It contains password hashes and secret keys, so admins only.
export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dir = mkdtempSync(join(tmpdir(), 'link-guide-backup-'));
  try {
    const file = join(dir, 'backup.sqlite');
    await backupDatabase(file);
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');

    return new NextResponse(readFileSync(file), {
      headers: {
        'Content-Type': 'application/vnd.sqlite3',
        'Content-Disposition': `attachment; filename="link-guide-${stamp}.sqlite"`,
        'Cache-Control': 'no-store',
      },
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// Replace the database with an uploaded backup.
export async function POST(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!rateLimit('backup-restore', 3, 60 * 60 * 1000).ok) {
    return NextResponse.json({ error: 'Too many restore attempts. Please try again later.' }, { status: 429 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Choose a backup file to restore' }, { status: 400 });
  }
  if (formData?.get('confirm') !== 'RESTORE') {
    return NextResponse.json({ error: 'Restore was not confirmed' }, { status: 400 });
  }
  if (file.size === 0 || file.size > MAX_BACKUP_BYTES) {
    return NextResponse.json({ error: 'The backup file is empty or too large' }, { status: 400 });
  }

  const dir = mkdtempSync(join(tmpdir(), 'link-guide-restore-'));
  try {
    const upload = join(dir, 'upload.sqlite');
    writeFileSync(upload, Buffer.from(await file.arrayBuffer()));
    if (statSync(upload).size === 0) {
      return NextResponse.json({ error: 'The backup file is empty' }, { status: 400 });
    }

    const problem = validateBackupFile(upload);
    if (problem) {
      return NextResponse.json({ error: problem }, { status: 400 });
    }

    await restoreDatabase(upload);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Database restore failed:', error);
    return NextResponse.json({ error: 'Restore failed. No changes were made.' }, { status: 500 });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
