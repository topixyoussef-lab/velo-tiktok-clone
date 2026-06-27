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

    const { video_id, text } = await req.json();

    if (!text || !text.trim()) {
      return NextResponse.json({ error: 'Comment text required' }, { status: 400 });
    }

    const id = uuidv4();
    db.prepare('INSERT INTO comments (id, user_id, video_id, text) VALUES (?, ?, ?, ?)').run(id, userId, video_id, text);
    db.prepare('UPDATE videos SET comments_count = comments_count + 1 WHERE id = ?').run(video_id);

    const video = db.prepare('SELECT user_id FROM videos WHERE id = ?').get(video_id) as any;
    if (video && video.user_id !== userId) {
      const notifId = uuidv4();
      db.prepare('INSERT INTO notifications (id, user_id, actor_id, type, video_id) VALUES (?, ?, ?, ?, ?)').run(notifId, video.user_id, userId, 'comment', video_id);
    }

    const comment = db.prepare(`
      SELECT c.*, u.username, u.display_name, u.avatar
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `).get(id);

    return NextResponse.json({ comment }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
