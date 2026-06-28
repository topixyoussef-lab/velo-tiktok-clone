import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUserId } from '@/lib/auth';
import { deleteFromStorage } from '@/lib/upload';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const currentUserId = await getCurrentUserId();

    const video = (await db.execute({ sql: `
      SELECT v.*, u.username, u.display_name, u.avatar
      FROM videos v
      JOIN users u ON v.user_id = u.id
      WHERE v.id = ?
    `, args: [id] })).rows[0] as any;

    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    video.is_own = currentUserId === video.user_id;
    video.is_liked = currentUserId
      ? !!(await db.execute({ sql: 'SELECT id FROM likes WHERE user_id = ? AND video_id = ?', args: [currentUserId, video.id] })).rows[0]
      : false;
    video.is_saved = currentUserId
      ? !!(await db.execute({ sql: 'SELECT id FROM saved_videos WHERE user_id = ? AND video_id = ?', args: [currentUserId, video.id] })).rows[0]
      : false;
    video.is_following = currentUserId
      ? !!(await db.execute({ sql: 'SELECT id FROM follows WHERE follower_id = ? AND following_id = ?', args: [currentUserId, video.user_id] })).rows[0]
      : false;
    video.is_followed_by = currentUserId
      ? !!(await db.execute({ sql: 'SELECT id FROM follows WHERE follower_id = ? AND following_id = ?', args: [video.user_id, currentUserId] })).rows[0]
      : false;

    const comments = (await db.execute({ sql: `
      SELECT c.*, u.username, u.display_name, u.avatar
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.video_id = ?
      ORDER BY c.created_at DESC
    `, args: [id] })).rows;

    return NextResponse.json({ video, comments });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const video = (await db.execute({ sql: 'SELECT * FROM videos WHERE id = ? AND user_id = ?', args: [id, userId] })).rows[0] as any;
    if (!video) return NextResponse.json({ error: 'Video not found or not yours' }, { status: 404 });

    try {
      await deleteFromStorage(video.file_path || '');
    } catch {}

    await db.execute({ sql: 'DELETE FROM likes WHERE video_id = ?', args: [id] });
    await db.execute({ sql: 'DELETE FROM comments WHERE video_id = ?', args: [id] });
    await db.execute({ sql: 'DELETE FROM saved_videos WHERE video_id = ?', args: [id] });
    await db.execute({ sql: 'DELETE FROM notifications WHERE video_id = ?', args: [id] });
    await db.execute({ sql: 'DELETE FROM videos WHERE id = ?', args: [id] });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
