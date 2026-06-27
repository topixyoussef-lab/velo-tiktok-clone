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

    const { following_id } = await req.json();

    if (userId === following_id) {
      return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 });
    }

    const existing = db.prepare('SELECT id FROM follows WHERE follower_id = ? AND following_id = ?').get(userId, following_id);
    if (existing) {
      db.prepare('DELETE FROM follows WHERE follower_id = ? AND following_id = ?').run(userId, following_id);
      const is_followed_by = !!db.prepare('SELECT id FROM follows WHERE follower_id = ? AND following_id = ?').get(following_id, userId);
      return NextResponse.json({ following: false, is_followed_by, is_friend: false });
    }

    const id = uuidv4();
    db.prepare('INSERT INTO follows (id, follower_id, following_id) VALUES (?, ?, ?)').run(id, userId, following_id);

    const notifId = uuidv4();
    db.prepare('INSERT INTO notifications (id, user_id, actor_id, type) VALUES (?, ?, ?, ?)').run(notifId, following_id, userId, 'follow');

    const is_followed_by = !!db.prepare('SELECT id FROM follows WHERE follower_id = ? AND following_id = ?').get(following_id, userId);
    return NextResponse.json({ following: true, is_followed_by, is_friend: is_followed_by });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
