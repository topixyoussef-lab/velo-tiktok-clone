import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';
import { getCurrentUserId } from '@/lib/auth';

export async function POST(req: Request, { params }: { params: Promise<{ id: string; commentId: string }> }) {
  try {
    const { id, commentId } = await params;
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const existing = (await db.execute({ sql: 'SELECT id FROM story_comment_likes WHERE user_id = ? AND comment_id = ?', args: [userId, commentId] })).rows[0] as any;

    if (existing) {
      await db.execute({ sql: 'DELETE FROM story_comment_likes WHERE id = ?', args: [existing.id] });
      await db.execute({ sql: 'UPDATE story_comments SET likes_count = GREATEST(0, likes_count - 1) WHERE id = ?', args: [commentId] });
      return NextResponse.json({ liked: false });
    } else {
      const likeId = uuidv4();
      await db.execute({ sql: 'INSERT INTO story_comment_likes (id, user_id, comment_id) VALUES (?, ?, ?)', args: [likeId, userId, commentId] });
      await db.execute({ sql: 'UPDATE story_comments SET likes_count = likes_count + 1 WHERE id = ?', args: [commentId] });
      return NextResponse.json({ liked: true });
    }
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
