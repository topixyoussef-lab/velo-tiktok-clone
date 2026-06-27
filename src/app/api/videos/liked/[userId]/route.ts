import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUserId } from '@/lib/auth';

export async function GET(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const { userId } = await params;
    const currentUserId = await getCurrentUserId();

    const videos = db.prepare(`
      SELECT v.*, u.username, u.display_name, u.avatar, u.wallet_address
      FROM videos v
      JOIN users u ON v.user_id = u.id
      JOIN likes l ON l.video_id = v.id
      WHERE l.user_id = ?
      ORDER BY l.created_at DESC
    `).all(userId) as any[];

    const enriched = videos.map(v => ({
      ...v,
      is_own: currentUserId === v.user_id,
      is_liked: true,
      is_saved: currentUserId
        ? !!db.prepare('SELECT id FROM saved_videos WHERE user_id = ? AND video_id = ?').get(currentUserId, v.id)
        : false,
      is_following: currentUserId
        ? !!db.prepare('SELECT id FROM follows WHERE follower_id = ? AND following_id = ?').get(currentUserId, v.user_id)
        : false,
      is_followed_by: currentUserId
        ? !!db.prepare('SELECT id FROM follows WHERE follower_id = ? AND following_id = ?').get(v.user_id, currentUserId)
        : false,
    }));

    return NextResponse.json({ videos: enriched });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
