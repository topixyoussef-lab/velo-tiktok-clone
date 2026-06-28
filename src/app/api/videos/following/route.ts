import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUserId } from '@/lib/auth';

export async function GET() {
  try {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) {
      return NextResponse.json({ videos: [] });
    }

    const uid = currentUserId.replace(/'/g, "''");
    const rows = (await db.execute({ sql: `
      SELECT v.*, u.username, u.display_name, u.avatar, u.wallet_address,
        FALSE AS is_own,
        EXISTS(SELECT 1 FROM likes WHERE user_id = '${uid}' AND video_id = v.id) AS is_liked,
        EXISTS(SELECT 1 FROM saved_videos WHERE user_id = '${uid}' AND video_id = v.id) AS is_saved,
        TRUE AS is_following,
        EXISTS(SELECT 1 FROM follows WHERE follower_id = v.user_id AND following_id = '${uid}') AS is_followed_by
      FROM videos v
      JOIN users u ON v.user_id = u.id
      WHERE v.user_id IN (
        SELECT following_id FROM follows WHERE follower_id = '${uid}'
      )
      ORDER BY v.created_at DESC
    ` })).rows as any[];

    return NextResponse.json({ videos: rows });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
