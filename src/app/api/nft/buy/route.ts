import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUserId } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { video_id, wallet_address } = await req.json();
    if (!video_id || !wallet_address) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

    const video = (await db.execute({ sql: 'SELECT * FROM videos WHERE id = ? AND is_nft = 1', args: [video_id] })).rows[0] as any;
    if (!video) return NextResponse.json({ error: 'NFT not found' }, { status: 404 });
    if (video.user_id === userId) return NextResponse.json({ error: 'You own this video already' }, { status: 400 });

    await db.execute({ sql: 'UPDATE videos SET nft_owner = ? WHERE id = ?', args: [wallet_address, video_id] });

    return NextResponse.json({ success: true, video_id, new_owner: wallet_address });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
