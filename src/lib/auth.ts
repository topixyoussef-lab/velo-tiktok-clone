import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import db from './db';

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

export function verifyPassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export function createSession(userId: string): string {
  const id = uuidv4();
  db.prepare('INSERT INTO sessions (id, user_id) VALUES (?, ?)').run(id, userId);
  return id;
}

export function getSessionUserId(sessionId: string): string | null {
  const row = db.prepare('SELECT user_id FROM sessions WHERE id = ?').get(sessionId) as { user_id: string } | undefined;
  return row?.user_id ?? null;
}

export async function getCurrentUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('session_id')?.value;
  if (!sessionId) return null;
  return getSessionUserId(sessionId);
}

export function getUserById(id: string) {
  return db.prepare('SELECT id, username, display_name, avatar, cover_photo, bio, created_at FROM users WHERE id = ?').get(id);
}

export function getUserByUsername(username: string) {
  return db.prepare('SELECT id, username, display_name, avatar, cover_photo, bio, created_at FROM users WHERE username = ?').get(username);
}
