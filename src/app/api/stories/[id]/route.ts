import { NextResponse } from 'next/server';
import { unlink } from 'fs/promises';
import path from 'path';
import db from '@/lib/db';
import { getCurrentUserId } from '@/lib/auth';

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const story = db.prepare('SELECT * FROM stories WHERE id = ?').get(id) as { user_id: string; file_path: string } | undefined;
    if (!story) return NextResponse.json({ error: 'Story not found' }, { status: 404 });
    if (story.user_id !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const filename = story.file_path.split('/').pop();
    if (filename) {
      try { await unlink(path.join(process.cwd(), 'uploads', filename)); } catch {}
    }

    db.prepare('DELETE FROM story_views WHERE story_id = ?').run(id);
    db.prepare('DELETE FROM stories WHERE id = ?').run(id);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
