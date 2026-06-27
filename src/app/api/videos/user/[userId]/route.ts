import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUserId } from '@/lib/auth';

export async function GET(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const { userId } = await params;
    const currentUserId = await getCurrentUserId();

    const videos = (await db.execute({ sql: `
      SELECT v.*, u.username, u.display_name, u.avatar, u.wallet_address
      FROM videos v
      JOIN users u ON v.user_id = u.id
      WHERE v.user_id = ?
      ORDER BY v.created_at DESC
    `, args: [userId] })).rows as any[];

    const enriched = await Promise.all(videos.map(async (v) => ({
      ...v,
      is_liked: currentUserId
        ? !!(await db.execute({ sql: 'SELECT id FROM likes WHERE user_id = ? AND video_id = ?', args: [currentUserId, v.id] })).rows[0]
        : false,
      is_saved: currentUserId
        ? !!(await db.execute({ sql: 'SELECT id FROM saved_videos WHERE user_id = ? AND video_id = ?', args: [currentUserId, v.id] })).rows[0]
        : false,
    })));

    return NextResponse.json({ videos: enriched });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
