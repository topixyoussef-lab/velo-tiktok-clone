import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import db from '@/lib/db';
import { getCurrentUserId } from '@/lib/auth';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const currentUserId = await getCurrentUserId();

    const video = db.prepare(`
      SELECT v.*, u.username, u.display_name, u.avatar
      FROM videos v
      JOIN users u ON v.user_id = u.id
      WHERE v.id = ?
    `).get(id) as any;

    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    video.is_own = currentUserId === video.user_id;
    video.is_liked = currentUserId
      ? !!db.prepare('SELECT id FROM likes WHERE user_id = ? AND video_id = ?').get(currentUserId, video.id)
      : false;
    video.is_saved = currentUserId
      ? !!db.prepare('SELECT id FROM saved_videos WHERE user_id = ? AND video_id = ?').get(currentUserId, video.id)
      : false;
    video.is_following = currentUserId
      ? !!db.prepare('SELECT id FROM follows WHERE follower_id = ? AND following_id = ?').get(currentUserId, video.user_id)
      : false;
    video.is_followed_by = currentUserId
      ? !!db.prepare('SELECT id FROM follows WHERE follower_id = ? AND following_id = ?').get(video.user_id, currentUserId)
      : false;

    const comments = db.prepare(`
      SELECT c.*, u.username, u.display_name, u.avatar
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.video_id = ?
      ORDER BY c.created_at DESC
    `).all(id);

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

    const video = db.prepare('SELECT * FROM videos WHERE id = ? AND user_id = ?').get(id, userId) as any;
    if (!video) return NextResponse.json({ error: 'Video not found or not yours' }, { status: 404 });

    const filePath = path.join(process.cwd(), video.file_path);
    try { fs.unlinkSync(filePath); } catch {}

    db.transaction(() => {
      db.prepare('DELETE FROM likes WHERE video_id = ?').run(id);
      db.prepare('DELETE FROM comments WHERE video_id = ?').run(id);
      db.prepare('DELETE FROM saved_videos WHERE video_id = ?').run(id);
      db.prepare('DELETE FROM notifications WHERE video_id = ?').run(id);
      db.prepare('DELETE FROM videos WHERE id = ?').run(id);
    })();

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
