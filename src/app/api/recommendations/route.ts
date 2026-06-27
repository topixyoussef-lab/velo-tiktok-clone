import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUserId } from '@/lib/auth';

export async function GET() {
  try {
    const currentUserId = await getCurrentUserId();

    let videos;
    if (currentUserId) {
      const likedUsers = (await db.execute({ sql: `
        SELECT DISTINCT v.user_id FROM likes l
        JOIN videos v ON l.video_id = v.id
        WHERE l.user_id = ?
      `, args: [currentUserId] })).rows as any[];
      const likedUserIds = likedUsers.map(u => u.user_id);

      const followedIds = ((await db.execute({ sql: 'SELECT following_id FROM follows WHERE follower_id = ?', args: [currentUserId] })).rows as any[]).map(r => r.following_id);

      const watchedCategories = likedUserIds.concat(followedIds);
      const placeholders = watchedCategories.length > 0 ? watchedCategories.map(() => '?').join(',') : null;

      let sql;
      if (placeholders) {
        sql = `
          SELECT v.*, u.username, u.display_name, u.avatar,
            CASE
              WHEN v.user_id IN (${placeholders}) THEN 2
              ELSE 1
            END AS score
          FROM videos v
          JOIN users u ON v.user_id = u.id
          WHERE v.user_id != ?
          ORDER BY score DESC, v.likes_count DESC, v.created_at DESC
          LIMIT 50
        `;
        videos = (await db.execute({ sql, args: [...watchedCategories, currentUserId] })).rows as any[];
      } else {
        sql = `
          SELECT v.*, u.username, u.display_name, u.avatar, 1 AS score
          FROM videos v
          JOIN users u ON v.user_id = u.id
          WHERE v.user_id != ?
          ORDER BY v.likes_count DESC, v.created_at DESC
          LIMIT 50
        `;
        videos = (await db.execute({ sql, args: [currentUserId] })).rows as any[];
      }
    } else {
      videos = (await db.execute({ sql: `
        SELECT v.*, u.username, u.display_name, u.avatar, 1 AS score
        FROM videos v
        JOIN users u ON v.user_id = u.id
        ORDER BY v.likes_count DESC, v.created_at DESC
        LIMIT 50
      ` })).rows as any[];
    }

    const enriched = await Promise.all(videos.map(async v => ({
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
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
