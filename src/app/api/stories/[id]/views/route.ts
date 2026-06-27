import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUserId } from '@/lib/auth';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ viewers: [] });

    const { id } = await params;
    const story = db.prepare('SELECT * FROM stories WHERE id = ?').get(id) as { user_id: string } | undefined;
    if (!story) return NextResponse.json({ viewers: [] });

    const viewers = db.prepare(`
      SELECT sv.user_id, u.username, u.display_name, u.avatar, sv.created_at
      FROM story_views sv
      JOIN users u ON sv.user_id = u.id
      WHERE sv.story_id = ?
      ORDER BY sv.created_at DESC
    `).all(id);

    return NextResponse.json({ viewers });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
