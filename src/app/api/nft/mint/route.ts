import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUserId } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { video_id, price } = await req.json();
    if (!video_id) return NextResponse.json({ error: 'Missing video_id' }, { status: 400 });

    const video = db.prepare('SELECT * FROM videos WHERE id = ? AND user_id = ?').get(video_id, userId) as any;
    if (!video) return NextResponse.json({ error: 'Video not found or not yours' }, { status: 404 });

    const wallet = (db.prepare('SELECT wallet_address FROM users WHERE id = ?').get(userId) as any)?.wallet_address;
    if (!wallet) return NextResponse.json({ error: 'Connect wallet first' }, { status: 400 });

    db.prepare('UPDATE videos SET is_nft = 1, nft_price = ?, nft_owner = ? WHERE id = ?').run(price || '0', wallet, video_id);

    return NextResponse.json({ success: true, video_id, price, owner: wallet });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
