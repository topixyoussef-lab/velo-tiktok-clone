import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUserId } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(req.url);
    const q = url.searchParams.get('q');

    let users;
    if (q?.trim()) {
      users = db.prepare(`
        SELECT id, username, display_name, avatar
        FROM users
        WHERE id != ? AND (username LIKE ? OR display_name LIKE ?)
        LIMIT 10
      `).all(userId, `%${q.trim()}%`, `%${q.trim()}%`);
    } else {
      users = db.prepare(`
        SELECT id, username, display_name, avatar
        FROM users
        WHERE id != ?
        AND id NOT IN (SELECT following_id FROM follows WHERE follower_id = ?)
        ORDER BY RANDOM()
        LIMIT 20
      `).all(userId, userId);
    }

    return NextResponse.json({ suggestions: users, users });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
