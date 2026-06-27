import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUserId } from '@/lib/auth';

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ notifications: [], unread_count: 0 });
    }

    const notifications = (await db.execute({ sql: `
      SELECT n.*, u.username AS actor_username, u.display_name AS actor_display_name, u.avatar AS actor_avatar
      FROM notifications n
      JOIN users u ON n.actor_id = u.id
      WHERE n.user_id = ?
      ORDER BY n.created_at DESC
      LIMIT 50
    `, args: [userId] })).rows;

    const unread_count = ((await db.execute({ sql: 'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read = 0', args: [userId] })).rows[0] as any).count;

    return NextResponse.json({ notifications, unread_count });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
