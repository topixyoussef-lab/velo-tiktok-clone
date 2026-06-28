import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUserId } from '@/lib/auth';

export async function GET() {
  try {
    const currentUserId = await getCurrentUserId();

    const userId = currentUserId || '';
    const rows = (await db.execute({ sql: `
      SELECT v.*, u.username, u.display_name, u.avatar, u.wallet_address,
        v.user_id = '${userId.replace(/'/g, "''")}' AS is_own,
        EXISTS(SELECT 1 FROM likes WHERE user_id = '${userId.replace(/'/g, "''")}' AND video_id = v.id) AS is_liked,
        EXISTS(SELECT 1 FROM saved_videos WHERE user_id = '${userId.replace(/'/g, "''")}' AND video_id = v.id) AS is_saved,
        EXISTS(SELECT 1 FROM follows WHERE follower_id = '${userId.replace(/'/g, "''")}' AND following_id = v.user_id) AS is_following,
        EXISTS(SELECT 1 FROM follows WHERE follower_id = v.user_id AND following_id = '${userId.replace(/'/g, "''")}') AS is_followed_by
      FROM videos v
      JOIN users u ON v.user_id = u.id
      ORDER BY v.created_at DESC
    ` })).rows as any[];

    return NextResponse.json({ videos: rows });
  } catch (e: any) {
    console.error('FEED ERROR:', e?.message || e?.toString() || 'Unknown error');
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
