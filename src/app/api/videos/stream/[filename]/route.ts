import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import { uploadsDir } from '@/lib/paths';

export async function GET(req: Request, { params }: { params: Promise<{ filename: string }> }) {
  try {
    const { filename } = await params;
    const filePath = path.join(uploadsDir, filename);
    const buffer = await readFile(filePath);

    const ext = filename.split('.').pop()?.toLowerCase();
    const mimeMap: Record<string, string> = {
      mp4: 'video/mp4',
      webm: 'video/webm',
      mov: 'video/quicktime',
      avi: 'video/x-msvideo',
    };

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': mimeMap[ext || 'mp4'] || 'video/mp4',
        'Cache-Control': 'public, max-age=31536000',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Video not found' }, { status: 404 });
  }
}
