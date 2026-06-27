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

export async function createSession(userId: string): Promise<string> {
  const id = uuidv4();
  await db.execute({ sql: 'INSERT INTO sessions (id, user_id) VALUES (?, ?)', args: [id, userId] });
  return id;
}

export async function getSessionUserId(sessionId: string): Promise<string | null> {
  const row = (await db.execute({ sql: 'SELECT user_id FROM sessions WHERE id = ?', args: [sessionId] })).rows[0] as any;
  return row?.user_id ?? null;
}

export async function getCurrentUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('session_id')?.value;
  if (!sessionId) return null;
  return await getSessionUserId(sessionId);
}

export async function getUserById(id: string) {
  return (await db.execute({ sql: 'SELECT id, username, display_name, avatar, cover_photo, bio, created_at FROM users WHERE id = ?', args: [id] })).rows[0];
}

export async function getUserByUsername(username: string) {
  return (await db.execute({ sql: 'SELECT id, username, display_name, avatar, cover_photo, bio, created_at FROM users WHERE username = ?', args: [username] })).rows[0];
}
