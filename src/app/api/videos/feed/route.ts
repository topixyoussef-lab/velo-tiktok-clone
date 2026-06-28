import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUserId } from '@/lib/auth';

export async function GET() {
  try {
    const currentUserId = await getCurrentUserId();

    const videos = (await db.execute({ sql: `
      SELECT v.*, u.username, u.display_name, u.avatar, u.wallet_address
      FROM videos v
      JOIN users u ON v.user_id = u.id
      ORDER BY v.created_at DESC
    ` })).rows as any[];

    const enriched = await Promise.all(videos.map(async (v) => ({
      ...v,
      is_own: currentUserId === v.user_id,
      is_liked: currentUserId
        ? !!(await db.execute({ sql: 'SELECT id FROM likes WHERE user_id = ? AND video_id = ?', args: [currentUserId, v.id] })).rows[0]
        : false,
      is_saved: currentUserId
        ? !!(await db.execute({ sql: 'SELECT id FROM saved_videos WHERE user_id = ? AND video_id = ?', args: [currentUserId, v.id] })).rows[0]
        : false,
      is_following: currentUserId
        ? !!(await db.execute({ sql: 'SELECT id FROM follows WHERE follower_id = ? AND following_id = ?', args: [currentUserId, v.user_id] })).rows[0]
        : false,
      is_followed_by: currentUserId
        ? !!(await db.execute({ sql: 'SELECT id FROM follows WHERE follower_id = ? AND following_id = ?', args: [v.user_id, currentUserId] })).rows[0]
        : false,
    })));

    return NextResponse.json({ videos: enriched });
  } catch (e: any) {
    console.error('FEED ERROR:', e?.message || e?.toString() || 'Unknown error');
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
