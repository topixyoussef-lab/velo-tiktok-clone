import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';
import { getCurrentUserId } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { to_user_id, video_id, amount, tx_hash } = await req.json();
    if (!to_user_id || !amount) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

    const id = uuidv4();
    db.prepare('INSERT INTO tips (id, from_user_id, to_user_id, video_id, amount, tx_hash) VALUES (?, ?, ?, ?, ?, ?)').run(id, userId, to_user_id, video_id || null, amount, tx_hash || '');

    return NextResponse.json({ tip: { id, amount } });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ tips: [] });

    const tips = db.prepare(`
      SELECT t.*, u.username AS from_username, u.display_name AS from_display_name
      FROM tips t
      JOIN users u ON t.from_user_id = u.id
      WHERE t.to_user_id = ?
      ORDER BY t.created_at DESC
      LIMIT 50
    `).all(userId);

    return NextResponse.json({ tips });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
