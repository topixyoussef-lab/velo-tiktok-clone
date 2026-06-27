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

    const existing = (await db.execute({ sql: 'SELECT id FROM follows WHERE follower_id = ? AND following_id = ?', args: [userId, following_id] })).rows[0];
    if (existing) {
      await db.execute({ sql: 'DELETE FROM follows WHERE follower_id = ? AND following_id = ?', args: [userId, following_id] });
      const is_followed_by = !!(await db.execute({ sql: 'SELECT id FROM follows WHERE follower_id = ? AND following_id = ?', args: [following_id, userId] })).rows[0];
      return NextResponse.json({ following: false, is_followed_by, is_friend: false });
    }

    const id = uuidv4();
    await db.execute({ sql: 'INSERT INTO follows (id, follower_id, following_id) VALUES (?, ?, ?)', args: [id, userId, following_id] });

    const notifId = uuidv4();
    await db.execute({ sql: 'INSERT INTO notifications (id, user_id, actor_id, type) VALUES (?, ?, ?, ?)', args: [notifId, following_id, userId, 'follow'] });

    const is_followed_by = !!(await db.execute({ sql: 'SELECT id FROM follows WHERE follower_id = ? AND following_id = ?', args: [following_id, userId] })).rows[0];
    return NextResponse.json({ following: true, is_followed_by, is_friend: is_followed_by });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
