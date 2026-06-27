'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@/lib/types';

export default function UploadPage() {
  const [user, setUser] = useState<User | null>(null);
  const [video, setVideo] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (!data.user) router.push('/login');
        else setUser(data.user);
      });
  }, [router]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideo(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!video) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('video', video);
    formData.append('caption', caption);

    try {
      const res = await fetch('/api/videos/upload', { method: 'POST', body: formData });
      if (res.ok) {
        router.push('/');
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Upload failed');
      }
    } catch (e) {
      alert('Upload failed: ' + (e instanceof Error ? e.message : 'Network error'));
    } finally {
      setUploading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-lg mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">Upload Video</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center">
            {preview ? (
              <video src={preview} className="max-h-64 mx-auto rounded-lg" controls />
            ) : (
              <label className="cursor-pointer block">
                <svg className="w-16 h-16 mx-auto text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-white/60 mt-2">Tap to select a video</p>
                <input type="file" accept="video/*" onChange={handleFileSelect} className="hidden" />
              </label>
            )}
          </div>

          <input
            type="text"
            placeholder="Write a caption..."
            value={caption}
            onChange={e => setCaption(e.target.value)}
            className="w-full bg-white/10 text-white px-4 py-3 rounded-lg outline-none focus:ring-2 focus:ring-purple-500"
          />

          <button
            type="submit"
            disabled={!video || uploading}
            className={`w-full py-3 rounded-lg font-semibold text-lg ${
              !video || uploading ? 'bg-white/20 text-white/40' : 'bg-red-500 text-white'
            }`}
          >
            {uploading ? 'Uploading...' : 'Post'}
          </button>
        </form>
      </div>
    </div>
  );
}
