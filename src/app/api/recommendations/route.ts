import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUserId } from '@/lib/auth';

export async function GET() {
  try {
    const currentUserId = await getCurrentUserId();

    let videos;
    if (currentUserId) {
      const likedUsers = db.prepare(`
        SELECT DISTINCT v.user_id FROM likes l
        JOIN videos v ON l.video_id = v.id
        WHERE l.user_id = ?
      `).all(currentUserId) as any[];
      const likedUserIds = likedUsers.map(u => u.user_id);

      const followedIds = (db.prepare('SELECT following_id FROM follows WHERE follower_id = ?').all(currentUserId) as any[]).map(r => r.following_id);

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
        videos = db.prepare(sql).all(...watchedCategories, currentUserId) as any[];
      } else {
        sql = `
          SELECT v.*, u.username, u.display_name, u.avatar, 1 AS score
          FROM videos v
          JOIN users u ON v.user_id = u.id
          WHERE v.user_id != ?
          ORDER BY v.likes_count DESC, v.created_at DESC
          LIMIT 50
        `;
        videos = db.prepare(sql).all(currentUserId) as any[];
      }
    } else {
      videos = db.prepare(`
        SELECT v.*, u.username, u.display_name, u.avatar, 1 AS score
        FROM videos v
        JOIN users u ON v.user_id = u.id
        ORDER BY v.likes_count DESC, v.created_at DESC
        LIMIT 50
      `).all() as any[];
    }

    const enriched = videos.map(v => ({
      ...v,
      is_own: currentUserId === v.user_id,
      is_liked: currentUserId
        ? !!db.prepare('SELECT id FROM likes WHERE user_id = ? AND video_id = ?').get(currentUserId, v.id)
        : false,
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
