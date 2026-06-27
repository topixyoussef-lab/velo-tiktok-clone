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

    const existing = db.prepare('SELECT id FROM saved_videos WHERE user_id = ? AND video_id = ?').get(userId, video_id);
    if (existing) {
      db.prepare('DELETE FROM saved_videos WHERE user_id = ? AND video_id = ?').run(userId, video_id);
      db.prepare('UPDATE videos SET saves_count = MAX(0, saves_count - 1) WHERE id = ?').run(video_id);
      const saves_count = (db.prepare('SELECT saves_count FROM videos WHERE id = ?').get(video_id) as any).saves_count;
      return NextResponse.json({ saved: false, saves_count });
    }

    const id = uuidv4();
    db.prepare('INSERT INTO saved_videos (id, user_id, video_id) VALUES (?, ?, ?)').run(id, userId, video_id);
    db.prepare('UPDATE videos SET saves_count = saves_count + 1 WHERE id = ?').run(video_id);
    const saves_count = (db.prepare('SELECT saves_count FROM videos WHERE id = ?').get(video_id) as any).saves_count;

    const video = db.prepare('SELECT user_id FROM videos WHERE id = ?').get(video_id) as any;
    if (video && video.user_id !== userId) {
      const notifId = uuidv4();
      db.prepare('INSERT INTO notifications (id, user_id, actor_id, type, video_id) VALUES (?, ?, ?, ?, ?)').run(notifId, video.user_id, userId, 'save', video_id);
    }

    return NextResponse.json({ saved: true, saves_count });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
