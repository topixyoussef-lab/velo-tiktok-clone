import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUserId } from '@/lib/auth';

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const conversations = db.prepare(`
      WITH latest AS (
        SELECT
          CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END AS other_user_id,
          m.text AS last_message,
          m.created_at AS last_message_at,
          ROW_NUMBER() OVER (
            PARTITION BY CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END
            ORDER BY m.created_at DESC
          ) AS rn
        FROM messages m
        WHERE m.sender_id = ? OR m.receiver_id = ?
      )
      SELECT
        l.other_user_id AS user_id,
        u.username,
        u.display_name,
        l.last_message,
        l.last_message_at,
        (SELECT COUNT(*) FROM messages WHERE sender_id = l.other_user_id AND receiver_id = ? AND read = 0) AS unread
      FROM latest l
      JOIN users u ON u.id = l.other_user_id
      WHERE l.rn = 1
      ORDER BY l.last_message_at DESC
    `).all(userId, userId, userId, userId, userId) as any[];

    return NextResponse.json({ conversations });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
