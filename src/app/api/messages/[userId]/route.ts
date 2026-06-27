import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUserId } from '@/lib/auth';

export async function GET(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = await params;

    await db.execute({ sql: 'UPDATE messages SET read = 1 WHERE sender_id = ? AND receiver_id = ?', args: [userId, currentUserId] });

    const messages = (await db.execute({ sql: `
      SELECT m.*, u_sender.username AS sender_username, u_sender.display_name AS sender_display_name
      FROM messages m
      JOIN users u_sender ON m.sender_id = u_sender.id
      WHERE (m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?)
      ORDER BY m.created_at ASC
    `, args: [currentUserId, userId, userId, currentUserId] })).rows as any[];

    const otherUser = (await db.execute({ sql: 'SELECT id, username, display_name FROM users WHERE id = ?', args: [userId] })).rows[0] as any;

    return NextResponse.json({ messages, other_user: otherUser });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
