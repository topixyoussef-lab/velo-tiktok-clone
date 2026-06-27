import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUserId } from '@/lib/auth';

export async function GET() {
  try {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) {
      return NextResponse.json({ videos: [] });
    }

    const videos = db.prepare(`
      SELECT v.*, u.username, u.display_name, u.avatar, u.wallet_address
      FROM videos v
      JOIN users u ON v.user_id = u.id
      WHERE v.user_id IN (
        SELECT following_id FROM follows WHERE follower_id = ?
      )
      ORDER BY v.created_at DESC
    `).all(currentUserId) as any[];

    const enriched = videos.map(v => ({
      ...v,
      is_own: false,
      is_liked: !!db.prepare('SELECT id FROM likes WHERE user_id = ? AND video_id = ?').get(currentUserId, v.id),
      is_saved: !!db.prepare('SELECT id FROM saved_videos WHERE user_id = ? AND video_id = ?').get(currentUserId, v.id),
      is_following: true,
      is_followed_by: !!db.prepare('SELECT id FROM follows WHERE follower_id = ? AND following_id = ?').get(v.user_id, currentUserId),
    }));

    return NextResponse.json({ videos: enriched });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
