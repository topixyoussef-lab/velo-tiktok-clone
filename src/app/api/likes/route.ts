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

    const existing = db.prepare('SELECT id FROM likes WHERE user_id = ? AND video_id = ?').get(userId, video_id);
    if (existing) {
      db.prepare('DELETE FROM likes WHERE user_id = ? AND video_id = ?').run(userId, video_id);
      db.prepare('UPDATE videos SET likes_count = MAX(0, likes_count - 1) WHERE id = ?').run(video_id);
      return NextResponse.json({ liked: false });
    }

    const id = uuidv4();
    db.prepare('INSERT INTO likes (id, user_id, video_id) VALUES (?, ?, ?)').run(id, userId, video_id);
    db.prepare('UPDATE videos SET likes_count = likes_count + 1 WHERE id = ?').run(video_id);

    const video = db.prepare('SELECT user_id FROM videos WHERE id = ?').get(video_id) as any;
    if (video && video.user_id !== userId) {
      const notifId = uuidv4();
      db.prepare('INSERT INTO notifications (id, user_id, actor_id, type, video_id) VALUES (?, ?, ?, ?, ?)').run(notifId, video.user_id, userId, 'like', video_id);
    }

    return NextResponse.json({ liked: true });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
