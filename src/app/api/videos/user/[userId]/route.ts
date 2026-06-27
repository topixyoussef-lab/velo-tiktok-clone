import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUserId } from '@/lib/auth';

export async function GET(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const { userId } = await params;
    const currentUserId = await getCurrentUserId();

    const videos = db.prepare(`
      SELECT v.*, u.username, u.display_name, u.avatar
      FROM videos v
      JOIN users u ON v.user_id = u.id
      WHERE v.user_id = ?
      ORDER BY v.created_at DESC
    `).all(userId) as any[];

    const enriched = videos.map(v => ({
      ...v,
      is_liked: currentUserId
        ? !!db.prepare('SELECT id FROM likes WHERE user_id = ? AND video_id = ?').get(currentUserId, v.id)
        : false,
      is_saved: currentUserId
        ? !!db.prepare('SELECT id FROM saved_videos WHERE user_id = ? AND video_id = ?').get(currentUserId, v.id)
        : false,
    }));

    return NextResponse.json({ videos: enriched });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
