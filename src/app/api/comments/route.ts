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

    const { video_id, text, parent_id } = await req.json();

    if (!text || !text.trim()) {
      return NextResponse.json({ error: 'Comment text required' }, { status: 400 });
    }

    const id = uuidv4();
    await db.execute({ sql: 'INSERT INTO comments (id, user_id, video_id, text, parent_id) VALUES (?, ?, ?, ?, ?)', args: [id, userId, video_id, text, parent_id || null] });
    await db.execute({ sql: 'UPDATE videos SET comments_count = comments_count + 1 WHERE id = ?', args: [video_id] });

    const video = (await db.execute({ sql: 'SELECT user_id FROM videos WHERE id = ?', args: [video_id] })).rows[0] as any;
    if (video && video.user_id !== userId) {
      const notifId = uuidv4();
      await db.execute({ sql: 'INSERT INTO notifications (id, user_id, actor_id, type, video_id) VALUES (?, ?, ?, ?, ?)', args: [notifId, video.user_id, userId, 'comment', video_id] });
    }

    const comment = (await db.execute({ sql: `
      SELECT c.*, u.username, u.display_name, u.avatar
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `, args: [id] })).rows[0];

    return NextResponse.json({ comment }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
