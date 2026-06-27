import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { verifyPassword, createSession } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { username, password, country } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'All fields required' }, { status: 400 });
    }

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;
    if (!user || !verifyPassword(password, user.password)) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    if (country) {
      db.prepare('UPDATE users SET country = ? WHERE id = ?').run(country, user.id);
    }

    const sessionId = createSession(user.id);

    const res = NextResponse.json({ user: { id: user.id, username: user.username, display_name: user.display_name } });
    res.cookies.set('session_id', sessionId, { httpOnly: true, path: '/', maxAge: 60 * 60 * 24 * 7 });

    return res;
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
