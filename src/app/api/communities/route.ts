import { NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/auth';
import db from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const communities = (await db.execute({ sql: `
    SELECT c.*, u.username as creator_username,
      (SELECT COUNT(*) FROM community_members WHERE community_id = c.id) as member_count,
      (SELECT 1 FROM community_members WHERE community_id = c.id AND user_id = ?) as is_member
    FROM communities c
    JOIN users u ON u.id = c.created_by
    ORDER BY c.created_at DESC
  `, args: [userId] })).rows;

  return NextResponse.json({ communities });
}

export async function POST(req: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { name, description } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

  const id = uuidv4();
  await db.execute({ sql: 'INSERT INTO communities (id, name, description, created_by) VALUES (?, ?, ?, ?)', args: [id, name.trim(), description?.trim() || '', userId] });
  await db.execute({ sql: 'INSERT INTO community_members (id, community_id, user_id, role) VALUES (?, ?, ?, ?)', args: [uuidv4(), id, userId, 'admin'] });

  return NextResponse.json({ community: { id, name: name.trim(), description: description?.trim() || '', created_by: userId } });
}
