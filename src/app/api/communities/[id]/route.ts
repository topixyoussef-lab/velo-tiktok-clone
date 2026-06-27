import { NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/auth';
import db from '@/lib/db';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const community = (await db.execute({ sql: `
    SELECT c.*, u.username as creator_username,
      (SELECT COUNT(*) FROM community_members WHERE community_id = c.id) as member_count,
      (SELECT role FROM community_members WHERE community_id = c.id AND user_id = ?) as my_role
    FROM communities c
    JOIN users u ON u.id = c.created_by
    WHERE c.id = ?
  `, args: [userId, id] })).rows[0] as any;

  if (!community) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const members = (await db.execute({ sql: `
    SELECT cm.*, u.username, u.display_name, u.avatar
    FROM community_members cm
    JOIN users u ON u.id = cm.user_id
    WHERE cm.community_id = ?
    ORDER BY cm.role, cm.joined_at
  `, args: [id] })).rows;

  return NextResponse.json({ community, members });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const community = (await db.execute({ sql: 'SELECT * FROM communities WHERE id = ?', args: [id] })).rows[0] as any;
  if (!community) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (community.created_by !== userId) return NextResponse.json({ error: 'Only the creator can delete' }, { status: 403 });

  await db.execute({ sql: 'DELETE FROM community_messages WHERE community_id = ?', args: [id] });
  await db.execute({ sql: 'DELETE FROM community_members WHERE community_id = ?', args: [id] });
  await db.execute({ sql: 'DELETE FROM communities WHERE id = ?', args: [id] });

  return NextResponse.json({ success: true });
}
