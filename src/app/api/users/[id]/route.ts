import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUserId } from '@/lib/auth';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const currentUserId = await getCurrentUserId();

    const user = (await db.execute({ sql: 'SELECT id, username, display_name, avatar, cover_photo, bio, wallet_address, created_at FROM users WHERE id = ?', args: [id] })).rows[0] as any;
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const followers_count = ((await db.execute({ sql: 'SELECT COUNT(*) as count FROM follows WHERE following_id = ?', args: [id] })).rows[0] as any).count;
    const following_count = ((await db.execute({ sql: 'SELECT COUNT(*) as count FROM follows WHERE follower_id = ?', args: [id] })).rows[0] as any).count;
    const videos_count = ((await db.execute({ sql: 'SELECT COUNT(*) as count FROM videos WHERE user_id = ?', args: [id] })).rows[0] as any).count;
    const likes_count = ((await db.execute({ sql: 'SELECT COUNT(*) as count FROM likes WHERE user_id = ?', args: [id] })).rows[0] as any).count;
    const likes_received_count = ((await db.execute({ sql: 'SELECT COUNT(*) as count FROM likes WHERE video_id IN (SELECT id FROM videos WHERE user_id = ?)', args: [id] })).rows[0] as any).count;

    const is_following = currentUserId
      ? !!(await db.execute({ sql: 'SELECT id FROM follows WHERE follower_id = ? AND following_id = ?', args: [currentUserId, id] })).rows[0]
      : false;

    const is_followed_by = currentUserId
      ? !!(await db.execute({ sql: 'SELECT id FROM follows WHERE follower_id = ? AND following_id = ?', args: [id, currentUserId] })).rows[0]
      : false;

    return NextResponse.json({
      user: { ...user, followers_count, following_count, videos_count, likes_count, likes_received_count, is_following, is_followed_by },
    });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (currentUserId !== id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { display_name, bio, avatar, cover_photo, wallet_address } = await req.json();

    const updates: string[] = [];
    const values: any[] = [];
    if (display_name !== undefined) { updates.push('display_name = ?'); values.push(display_name); }
    if (bio !== undefined) { updates.push('bio = ?'); values.push(bio); }
    if (avatar !== undefined) { updates.push('avatar = ?'); values.push(avatar); }
    if (cover_photo !== undefined) { updates.push('cover_photo = ?'); values.push(cover_photo); }
    if (wallet_address !== undefined) { updates.push('wallet_address = ?'); values.push(wallet_address); }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    values.push(id);
    await db.execute({ sql: `UPDATE users SET ${updates.join(', ')} WHERE id = ?`, args: values });

    const user = (await db.execute({ sql: 'SELECT id, username, display_name, avatar, cover_photo, bio, wallet_address, created_at FROM users WHERE id = ?', args: [id] })).rows[0] as any;

    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
