import { NextResponse } from 'next/server';
import { getCurrentUserId, getUserById } from '@/lib/auth';

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ user: null });
  }
  const user = getUserById(userId);
  return NextResponse.json({ user });
}
