import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';
import { getCurrentUserId } from '@/lib/auth';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const existing = (await db.execute({ sql: 'SELECT id FROM comment_likes WHERE user_id = ? AND comment_id = ?', args: [userId, id] })).rows[0] as any;

    if (existing) {
      await db.execute({ sql: 'DELETE FROM comment_likes WHERE id = ?', args: [existing.id] });
      await db.execute({ sql: 'UPDATE comments SET likes_count = GREATEST(0, likes_count - 1) WHERE id = ?', args: [id] });
      return NextResponse.json({ liked: false });
    } else {
      const likeId = uuidv4();
      await db.execute({ sql: 'INSERT INTO comment_likes (id, user_id, comment_id) VALUES (?, ?, ?)', args: [likeId, userId, id] });
      await db.execute({ sql: 'UPDATE comments SET likes_count = likes_count + 1 WHERE id = ?', args: [id] });
      return NextResponse.json({ liked: true });
    }
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
