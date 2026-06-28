import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUserId } from '@/lib/auth';

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const comment = (await db.execute({ sql: 'SELECT * FROM comments WHERE id = ?', args: [id] })).rows[0] as any;
    if (!comment) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (comment.user_id !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    await db.execute({ sql: 'UPDATE videos SET comments_count = GREATEST(0, comments_count - 1) WHERE id = ?', args: [comment.video_id] });
    await db.execute({ sql: 'DELETE FROM comment_likes WHERE comment_id = ?', args: [id] });
    await db.execute({ sql: 'DELETE FROM comments WHERE id = ?', args: [id] });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
