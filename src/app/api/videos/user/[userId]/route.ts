import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUserId } from '@/lib/auth';

export async function GET(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const { userId } = await params;
    const currentUserId = await getCurrentUserId();
    const uid = (currentUserId || '').replace(/'/g, "''");

    const rows = (await db.execute({ sql: `
      SELECT v.*, u.username, u.display_name, u.avatar, u.wallet_address,
        EXISTS(SELECT 1 FROM likes WHERE user_id = '${uid}' AND video_id = v.id) AS is_liked,
        EXISTS(SELECT 1 FROM saved_videos WHERE user_id = '${uid}' AND video_id = v.id) AS is_saved
      FROM videos v
      JOIN users u ON v.user_id = u.id
      WHERE v.user_id = '${userId.replace(/'/g, "''")}'
      ORDER BY v.created_at DESC
    ` })).rows as any[];

    return NextResponse.json({ videos: rows });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
