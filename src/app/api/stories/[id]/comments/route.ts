import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';
import { getCurrentUserId } from '@/lib/auth';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const comments = (await db.execute({ sql: `
      SELECT sc.*, u.username, u.display_name, u.avatar
      FROM story_comments sc
      JOIN users u ON sc.user_id = u.id
      WHERE sc.story_id = ?
      ORDER BY sc.created_at DESC
    `, args: [id] })).rows;

    return NextResponse.json({ comments });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const { text } = await req.json();
    if (!text?.trim()) return NextResponse.json({ error: 'Text required' }, { status: 400 });

    const story = (await db.execute({ sql: 'SELECT * FROM stories WHERE id = ?', args: [id] })).rows[0] as any;
    if (!story) return NextResponse.json({ error: 'Story not found' }, { status: 404 });

    const commentId = uuidv4();
    await db.execute({ sql: 'INSERT INTO story_comments (id, story_id, user_id, text) VALUES (?, ?, ?, ?)', args: [commentId, id, userId, text] });
    await db.execute({ sql: 'UPDATE stories SET comments_count = comments_count + 1 WHERE id = ?', args: [id] });

    if (story.user_id !== userId) {
      const notifId = uuidv4();
      await db.execute({ sql: 'INSERT INTO notifications (id, user_id, actor_id, type, story_id) VALUES (?, ?, ?, ?, ?)', args: [notifId, story.user_id, userId, 'story_comment', id] });
    }

    const comment = (await db.execute({ sql: `
      SELECT sc.*, u.username, u.display_name, u.avatar
      FROM story_comments sc
      JOIN users u ON sc.user_id = u.id
      WHERE sc.id = ?
    `, args: [commentId] })).rows[0];

    return NextResponse.json({ comment });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
