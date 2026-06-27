import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUserId } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { video_id, price } = await req.json();
    if (!video_id) return NextResponse.json({ error: 'Missing video_id' }, { status: 400 });

    const video = (await db.execute({ sql: 'SELECT * FROM videos WHERE id = ? AND user_id = ?', args: [video_id, userId] })).rows[0] as any;
    if (!video) return NextResponse.json({ error: 'Video not found or not yours' }, { status: 404 });

    const wallet = ((await db.execute({ sql: 'SELECT wallet_address FROM users WHERE id = ?', args: [userId] })).rows[0] as any)?.wallet_address;
    if (!wallet) return NextResponse.json({ error: 'Connect wallet first' }, { status: 400 });

    await db.execute({ sql: 'UPDATE videos SET is_nft = 1, nft_price = ?, nft_owner = ? WHERE id = ?', args: [price || '0', wallet, video_id] });

    return NextResponse.json({ success: true, video_id, price, owner: wallet });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
