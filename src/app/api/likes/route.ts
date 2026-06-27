import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';
import { getCurrentUserId } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { video_id } = await req.json();

    const existing = (await db.execute({ sql: 'SELECT id FROM likes WHERE user_id = ? AND video_id = ?', args: [userId, video_id] })).rows[0];
    if (existing) {
      await db.execute({ sql: 'DELETE FROM likes WHERE user_id = ? AND video_id = ?', args: [userId, video_id] });
      await db.execute({ sql: 'UPDATE videos SET likes_count = MAX(0, likes_count - 1) WHERE id = ?', args: [video_id] });
      return NextResponse.json({ liked: false });
    }

    const id = uuidv4();
    await db.execute({ sql: 'INSERT INTO likes (id, user_id, video_id) VALUES (?, ?, ?)', args: [id, userId, video_id] });
    await db.execute({ sql: 'UPDATE videos SET likes_count = likes_count + 1 WHERE id = ?', args: [video_id] });

    const video = (await db.execute({ sql: 'SELECT user_id FROM videos WHERE id = ?', args: [video_id] })).rows[0] as any;
    if (video && video.user_id !== userId) {
      const notifId = uuidv4();
      await db.execute({ sql: 'INSERT INTO notifications (id, user_id, actor_id, type, video_id) VALUES (?, ?, ?, ?, ?)', args: [notifId, video.user_id, userId, 'like', video_id] });
    }

    return NextResponse.json({ liked: true });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
