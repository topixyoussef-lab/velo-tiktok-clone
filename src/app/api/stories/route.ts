import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import db from '@/lib/db';
import { getCurrentUserId } from '@/lib/auth';
import { uploadsDir } from '@/lib/paths';

export async function POST(req: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });

    const ext = file.name.split('.').pop() || 'jpg';
    const fileName = `${uuidv4()}.${ext}`;
    await mkdir(uploadsDir, { recursive: true });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(path.join(uploadsDir, fileName), buffer);

    const storyId = uuidv4();
    const filePath = `/api/uploads/stream/${fileName}`;
    db.prepare('INSERT INTO stories (id, user_id, file_path) VALUES (?, ?, ?)').run(storyId, userId, filePath);

    return NextResponse.json({ story: { id: storyId, file_path: filePath } });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ stories: [] });

    const stories = db.prepare(`
      SELECT s.*, u.username, u.display_name, u.avatar,
        CASE WHEN sl.id IS NOT NULL THEN 1 ELSE 0 END as is_liked
      FROM stories s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN story_likes sl ON sl.story_id = s.id AND sl.user_id = ?
      WHERE (
        s.user_id IN (
          SELECT f1.following_id FROM follows f1
          JOIN follows f2 ON f1.follower_id = f2.following_id AND f1.following_id = f2.follower_id
          WHERE f1.follower_id = ?
        )
        OR s.user_id = ?
      )
      AND s.created_at > datetime('now', '-1 day')
      ORDER BY s.created_at DESC
    `).all(userId, userId, userId);

    return NextResponse.json({ stories });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
