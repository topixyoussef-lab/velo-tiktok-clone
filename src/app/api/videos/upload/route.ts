import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { writeFile, mkdir, appendFile } from 'fs/promises';
import path from 'path';
import db from '@/lib/db';
import { getCurrentUserId } from '@/lib/auth';
import { uploadsDir } from '@/lib/paths';

export const maxDuration = 120;

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

    const ext = file.name.split('.').pop() || 'mp4';
    const fileName = `${uuidv4()}.${ext}`;
    await mkdir(uploadsDir, { recursive: true });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filePath = path.join(uploadsDir, fileName);
    await writeFile(filePath, buffer);

    const videoId = uuidv4();
    const videoUrl = `/api/videos/stream/${fileName}`;

    db.prepare('INSERT INTO videos (id, user_id, file_path, caption) VALUES (?, ?, ?, ?)').run(videoId, userId, videoUrl, caption);

    return NextResponse.json({ video: { id: videoId, url: videoUrl, caption } }, { status: 201 });
  } catch (e: unknown) {
    try { await appendFile(path.join(process.cwd(), 'error.log'), `[${new Date().toISOString()}] ${e instanceof Error ? e.stack : String(e)}\n`); } catch {}
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
