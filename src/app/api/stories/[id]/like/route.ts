import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';
import { getCurrentUserId } from '@/lib/auth';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const story = db.prepare('SELECT * FROM stories WHERE id = ?').get(id) as { user_id: string } | undefined;
    if (!story) return NextResponse.json({ error: 'Story not found' }, { status: 404 });

    const existing = db.prepare('SELECT id FROM story_likes WHERE story_id = ? AND user_id = ?').get(id, userId);
    if (existing) {
      db.prepare('DELETE FROM story_likes WHERE story_id = ? AND user_id = ?').run(id, userId);
      db.prepare('UPDATE stories SET likes_count = MAX(0, likes_count - 1) WHERE id = ?').run(id);
      return NextResponse.json({ liked: false });
    }

    const likeId = uuidv4();
    db.prepare('INSERT INTO story_likes (id, story_id, user_id) VALUES (?, ?, ?)').run(likeId, id, userId);
    db.prepare('UPDATE stories SET likes_count = likes_count + 1 WHERE id = ?').run(id);

    if (story.user_id !== userId) {
      try {
        const notifId = uuidv4();
        db.prepare('INSERT INTO notifications (id, user_id, actor_id, type, story_id) VALUES (?, ?, ?, ?, ?)').run(notifId, story.user_id, userId, 'story_like', id);
      } catch {}
    }

    return NextResponse.json({ liked: true });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
