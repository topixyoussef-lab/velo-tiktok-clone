'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function EditProfilePage() {
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState('');
  const [coverPhoto, setCoverPhoto] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<'avatar' | 'cover' | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (!data.user) { router.push('/login'); return; }
        setUserId(data.user.id);
        setDisplayName(data.user.display_name || '');
        setBio(data.user.bio || '');
        setAvatar(data.user.avatar || '');
        setCoverPhoto(data.user.cover_photo || '');
        setLoading(false);
      });
  }, [router]);

  const uploadImage = async (file: File, type: 'avatar' | 'cover') => {
    setUploading(type);
    const formData = new FormData();
    formData.append('image', file);
    formData.append('type', type);
    try {
      const res = await fetch('/api/uploads/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok) {
        if (type === 'avatar') setAvatar(data.url);
        else setCoverPhoto(data.url);
      } else {
        alert(data.error || 'Upload failed');
      }
    } catch (e) {
      alert('Upload error: ' + (e instanceof Error ? e.message : 'Unknown'));
    }
    setUploading(null);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadImage(file, 'avatar');
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadImage(file, 'cover');
  };

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: displayName, bio, avatar, cover_photo: coverPhoto }),
      });
      if (res.ok) {
        router.push(`/profile/${userId}`);
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Error saving profile');
      }
    } catch {
      alert('Error saving profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <button onClick={() => router.back()} className="text-white/70">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-white font-semibold">Edit Profile</h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-red-500 text-white px-4 py-1.5 rounded-full text-sm font-semibold disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="relative h-44 bg-white/5">
          {coverPhoto && (
            <img src={coverPhoto} className="w-full h-full object-cover" />
          )}
          <button
            onClick={() => coverInputRef.current?.click()}
            className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition"
          >
            {uploading === 'cover' ? (
              <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-10 h-10 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            )}
          </button>
          <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />
        </div>

        <div className="px-4 -mt-12 mb-4 relative z-10 flex items-end gap-4">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-purple-500 border-4 border-black overflow-hidden">
              {avatar ? (
                <img src={avatar} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white text-3xl font-bold">
                  {displayName?.[0]?.toUpperCase() || 'U'}
                </div>
              )}
            </div>
            <button
              onClick={() => avatarInputRef.current?.click()}
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-red-500 flex items-center justify-center"
            >
              {uploading === 'avatar' ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
              )}
            </button>
            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>
        </div>

        <div className="px-4 space-y-5 pb-6">
          <div>
            <label className="text-white/50 text-xs font-semibold uppercase tracking-wide">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              className="w-full bg-white/10 text-white px-4 py-2.5 rounded-lg mt-1 outline-none text-sm"
            />
          </div>

          <div>
            <label className="text-white/50 text-xs font-semibold uppercase tracking-wide">Bio</label>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              rows={4}
              className="w-full bg-white/10 text-white px-4 py-2.5 rounded-lg mt-1 outline-none text-sm resize-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
