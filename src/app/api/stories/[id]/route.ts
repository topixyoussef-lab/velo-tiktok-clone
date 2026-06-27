import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUserId } from '@/lib/auth';
import { deleteFromCloudinary, getPublicIdFromUrl } from '@/lib/upload';

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const story = (await db.execute({ sql: 'SELECT * FROM stories WHERE id = ?', args: [id] })).rows[0] as any;
    if (!story) return NextResponse.json({ error: 'Story not found' }, { status: 404 });
    if (story.user_id !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    try {
      const publicId = getPublicIdFromUrl(story.file_path);
      if (publicId) await deleteFromCloudinary(publicId);
    } catch {}

    await db.execute({ sql: 'DELETE FROM story_views WHERE story_id = ?', args: [id] });
    await db.execute({ sql: 'DELETE FROM stories WHERE id = ?', args: [id] });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
