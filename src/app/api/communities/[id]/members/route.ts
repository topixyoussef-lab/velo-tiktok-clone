import { NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/auth';
import db from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { user_id } = await req.json();
  if (!user_id) return NextResponse.json({ error: 'user_id is required' }, { status: 400 });

  const role = (await db.execute({ sql: 'SELECT role FROM community_members WHERE community_id = ? AND user_id = ?', args: [id, userId] })).rows[0] as any;
  if (!role || role.role !== 'admin') return NextResponse.json({ error: 'Only admins can add members' }, { status: 403 });

  try {
    await db.execute({ sql: 'INSERT INTO community_members (id, community_id, user_id, role) VALUES (?, ?, ?, ?)', args: [uuidv4(), id, user_id, 'member'] });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Already a member' }, { status: 409 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const url = new URL(req.url);
  const memberId = url.searchParams.get('user_id');
  if (!memberId) return NextResponse.json({ error: 'user_id required' }, { status: 400 });

  const role = (await db.execute({ sql: 'SELECT role FROM community_members WHERE community_id = ? AND user_id = ?', args: [id, userId] })).rows[0] as any;
  if (!role || role.role !== 'admin') return NextResponse.json({ error: 'Only admins can remove members' }, { status: 403 });

  await db.execute({ sql: 'DELETE FROM community_members WHERE community_id = ? AND user_id = ?', args: [id, memberId] });
  return NextResponse.json({ success: true });
}
