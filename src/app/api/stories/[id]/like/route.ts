import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';
import { getCurrentUserId } from '@/lib/auth';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const story = (await db.execute({ sql: 'SELECT * FROM stories WHERE id = ?', args: [id] })).rows[0] as any;
    if (!story) return NextResponse.json({ error: 'Story not found' }, { status: 404 });

    const existing = (await db.execute({ sql: 'SELECT id FROM story_likes WHERE story_id = ? AND user_id = ?', args: [id, userId] })).rows[0];
    if (existing) {
      await db.execute({ sql: 'DELETE FROM story_likes WHERE story_id = ? AND user_id = ?', args: [id, userId] });
      await db.execute({ sql: 'UPDATE stories SET likes_count = MAX(0, likes_count - 1) WHERE id = ?', args: [id] });
      return NextResponse.json({ liked: false });
    }

    const likeId = uuidv4();
    await db.execute({ sql: 'INSERT INTO story_likes (id, story_id, user_id) VALUES (?, ?, ?)', args: [likeId, id, userId] });
    await db.execute({ sql: 'UPDATE stories SET likes_count = likes_count + 1 WHERE id = ?', args: [id] });

    if (story.user_id !== userId) {
      try {
        const notifId = uuidv4();
        await db.execute({ sql: 'INSERT INTO notifications (id, user_id, actor_id, type, story_id) VALUES (?, ?, ?, ?, ?)', args: [notifId, story.user_id, userId, 'story_like', id] });
      } catch {}
    }

    return NextResponse.json({ liked: true });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
