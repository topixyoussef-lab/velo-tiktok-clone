import { v4 as uuidv4 } from 'uuid';
import { getSupabase } from './db';

export async function uploadToSupabase(
  buffer: Buffer,
  options: { bucket?: string; folder?: string; contentType?: string } = {}
): Promise<string> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase not configured');

  const bucket = options.bucket || 'videos';
  const folder = options.folder || '';
  const ext = options.contentType?.split('/')[1] || 'bin';
  const fileName = `${uuidv4()}.${ext}`;
  const filePath = folder ? `${folder}/${fileName}` : fileName;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(filePath, buffer, {
      contentType: options.contentType || 'application/octet-stream',
      cacheControl: '3600',
      upsert: false,
    });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
  return data.publicUrl;
}

export async function deleteFromStorage(url: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase not configured');

  const path = extractPath(url);
  if (!path) return;

  const { error } = await supabase.storage.from('videos').remove([path]);
  if (error) throw new Error(error.message);
}

export async function deleteFromBucket(url: string, bucket: string = 'videos'): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase not configured');

  const path = extractPath(url);
  if (!path) return;

  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) throw new Error(error.message);
}

function extractPath(url: string): string {
  const parts = url.split('/');
  const bucketIndex = parts.indexOf('storage/v1/object/public');
  if (bucketIndex === -1) return '';
  return parts.slice(bucketIndex + 4).join('/');
}
