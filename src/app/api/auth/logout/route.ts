import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  const res = NextResponse.json({ success: true });
  res.cookies.set('session_id', '', { httpOnly: true, path: '/', maxAge: 0 });
  return res;
}
