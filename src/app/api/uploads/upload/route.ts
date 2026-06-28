import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getCurrentUserId } from '@/lib/auth';
import { uploadToSupabase } from '@/lib/upload';

export async function POST(req: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get('image') as File;
    if (!file) return NextResponse.json({ error: 'No image file' }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const url = await uploadToSupabase(buffer, { bucket: 'images', contentType: file.type });

    return NextResponse.json({ url });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
