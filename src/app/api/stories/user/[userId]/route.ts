import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;

  const stories = (await db.execute({ sql: `
    SELECT s.*, u.username, u.display_name, u.avatar
    FROM stories s
    JOIN users u ON s.user_id = u.id
    WHERE s.user_id = ?
    AND s.created_at > datetime('now', '-1 day')
    ORDER BY s.created_at DESC
  `, args: [userId] })).rows;

  return NextResponse.json({ stories });
}
