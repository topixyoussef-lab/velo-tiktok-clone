import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';
import { hashPassword, createSession } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { username, display_name, password, age, gender, country } = await req.json();

    if (!username || !display_name || !password) {
      return NextResponse.json({ error: 'All fields required' }, { status: 400 });
    }

    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existing) {
      return NextResponse.json({ error: 'Username already taken' }, { status: 400 });
    }

    const id = uuidv4();
    const hashedPassword = hashPassword(password);

    const ageNum = age ? parseInt(age as string, 10) : null;
    db.prepare('INSERT INTO users (id, username, display_name, password, country, age, gender) VALUES (?, ?, ?, ?, ?, ?, ?)').run(id, username, display_name, hashedPassword, country || '', ageNum, gender || '');

    const sessionId = createSession(id);

    const res = NextResponse.json({ user: { id, username, display_name } }, { status: 201 });
    res.cookies.set('session_id', sessionId, { httpOnly: true, path: '/', maxAge: 60 * 60 * 24 * 7 });

    return res;
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
