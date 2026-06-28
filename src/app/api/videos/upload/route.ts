import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';
import { getCurrentUserId } from '@/lib/auth';
import { uploadToSupabase } from '@/lib/upload';

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('video') as File;
    const caption = formData.get('caption') as string || '';

    if (!file) {
      return NextResponse.json({ error: 'No video file provided' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const videoUrl = await uploadToSupabase(buffer, { bucket: 'videos', contentType: file.type });

    const videoId = uuidv4();

    await db.execute({ sql: 'INSERT INTO videos (id, user_id, file_path, caption) VALUES (?, ?, ?, ?)', args: [videoId, userId, videoUrl, caption] });

    return NextResponse.json({ video: { id: videoId, url: videoUrl, caption } }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
