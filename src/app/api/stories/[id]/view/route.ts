import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';
import { getCurrentUserId } from '@/lib/auth';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const story = db.prepare('SELECT * FROM stories WHERE id = ?').get(id) as { user_id: string; id: string } | undefined;
    if (!story) return NextResponse.json({ error: 'Story not found' }, { status: 404 });

    const existing = db.prepare('SELECT id FROM story_views WHERE story_id = ? AND user_id = ?').get(id, userId);
    if (!existing) {
      const viewId = uuidv4();
      db.prepare('INSERT INTO story_views (id, story_id, user_id) VALUES (?, ?, ?)').run(viewId, id, userId);
      db.prepare('UPDATE stories SET views_count = views_count + 1 WHERE id = ?').run(id);

      if (story.user_id !== userId) {
        const notifId = uuidv4();
        db.prepare('INSERT INTO notifications (id, user_id, actor_id, type, story_id) VALUES (?, ?, ?, ?, ?)').run(notifId, story.user_id, userId, 'story_view', id);
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
