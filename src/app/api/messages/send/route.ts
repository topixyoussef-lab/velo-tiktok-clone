import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';
import { getCurrentUserId } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { receiver_id, text } = await req.json();

    if (!receiver_id || !text?.trim()) {
      return NextResponse.json({ error: 'Receiver and text required' }, { status: 400 });
    }

    const receiver = (await db.execute({ sql: 'SELECT id FROM users WHERE id = ?', args: [receiver_id] })).rows[0];
    if (!receiver) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const id = uuidv4();
    await db.execute({ sql: 'INSERT INTO messages (id, sender_id, receiver_id, text) VALUES (?, ?, ?, ?)', args: [id, userId, receiver_id, text] });

    return NextResponse.json({ message: { id, sender_id: userId, receiver_id, text, created_at: new Date().toISOString() } }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
