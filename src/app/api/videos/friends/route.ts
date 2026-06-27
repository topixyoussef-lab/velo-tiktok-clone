import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUserId } from '@/lib/auth';

export async function GET() {
  try {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) {
      return NextResponse.json({ videos: [] });
    }

    const videos = (await db.execute({ sql: `
      SELECT v.*, u.username, u.display_name, u.avatar, u.wallet_address
      FROM videos v
      JOIN users u ON v.user_id = u.id
      WHERE v.user_id IN (
        SELECT f1.following_id FROM follows f1
        JOIN follows f2 ON f1.follower_id = f2.following_id AND f1.following_id = f2.follower_id
        WHERE f1.follower_id = ?
      )
      ORDER BY v.created_at DESC
    `, args: [currentUserId] })).rows as any[];

    const enriched = await Promise.all(videos.map(async (v) => ({
      ...v,
      is_liked: !!(await db.execute({ sql: 'SELECT id FROM likes WHERE user_id = ? AND video_id = ?', args: [currentUserId, v.id] })).rows[0],
      is_saved: !!(await db.execute({ sql: 'SELECT id FROM saved_videos WHERE user_id = ? AND video_id = ?', args: [currentUserId, v.id] })).rows[0],
      is_following: true,
      is_followed_by: true,
    })));

    return NextResponse.json({ videos: enriched });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
