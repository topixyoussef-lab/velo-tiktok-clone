import { NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/auth';
import db from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET(req: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const communityId = url.searchParams.get('community_id');

  if (!communityId) return NextResponse.json({ messages: [] });

  const messages = (await db.execute({ sql: `
    SELECT cm.*, u.username, u.display_name, u.avatar
    FROM community_messages cm
    JOIN users u ON u.id = cm.user_id
    WHERE cm.community_id = ?
    ORDER BY cm.created_at ASC
    LIMIT 100
  `, args: [communityId] })).rows;

  return NextResponse.json({ messages });
}

export async function POST(req: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { text, community_id } = await req.json();
  if (!text?.trim()) return NextResponse.json({ error: 'Text is required' }, { status: 400 });
  if (!community_id) return NextResponse.json({ error: 'community_id is required' }, { status: 400 });

  const isMember = (await db.execute({ sql: 'SELECT 1 FROM community_members WHERE community_id = ? AND user_id = ?', args: [community_id, userId] })).rows[0];
  if (!isMember) return NextResponse.json({ error: 'Not a member' }, { status: 403 });

  const id = uuidv4();
  await db.execute({ sql: 'INSERT INTO community_messages (id, user_id, text, community_id) VALUES (?, ?, ?, ?)', args: [id, userId, text.trim(), community_id] });

  const message = (await db.execute({ sql: `
    SELECT cm.*, u.username, u.display_name, u.avatar
    FROM community_messages cm
    JOIN users u ON u.id = cm.user_id
    WHERE cm.id = ?
  `, args: [id] })).rows[0];

  return NextResponse.json({ message });
}
