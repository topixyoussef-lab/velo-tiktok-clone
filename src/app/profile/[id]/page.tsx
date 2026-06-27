'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import StoryViewer from '@/components/StoryViewer';
import type { User, Video, Story } from '@/lib/types';

export default function ProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<User | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [tab, setTab] = useState<'videos' | 'likes' | 'saved' | 'nfts'>('videos');
  const [stories, setStories] = useState<Story[]>([]);
  const [storyIndex, setStoryIndex] = useState<number | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => setCurrentUser(data.user));

    Promise.all([
      fetch(`/api/users/${id}`).then(res => res.json()),
      fetch(`/api/videos/user/${id}`).then(res => res.json()),
      fetch(`/api/stories/user/${id}`).then(res => res.json()),
    ]).then(([userData, videoData, storyData]) => {
      setProfile(userData.user);
      setVideos(videoData.videos || []);
      setStories(storyData.stories || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (tab === 'videos') {
      fetch(`/api/videos/user/${id}`).then(res => res.json()).then(d => setVideos(d.videos || [])).catch(() => {});
    } else if (tab === 'likes') {
      fetch(`/api/videos/liked/${id}`).then(res => res.json()).then(d => setVideos(d.videos || [])).catch(() => {});
    } else if (tab === 'saved') {
      fetch(`/api/videos/saved/${id}`).then(res => res.json()).then(d => setVideos(d.videos || [])).catch(() => {});
    } else {
      fetch(`/api/videos/user/${id}`).then(res => res.json()).then(d => setVideos((d.videos || []).filter((v: any) => v.is_nft))).catch(() => {});
    }
  }, [tab, id]);

  const handleFollow = async () => {
    if (!profile) return;
    const wasFollowing = profile.is_following;
    const wasFollowedBy = profile.is_followed_by;
    const wasCount = profile.followers_count || 0;
    setProfile({ ...profile, is_following: !wasFollowing, followers_count: wasCount + (wasFollowing ? -1 : 1) });
    const res = await fetch('/api/follow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ following_id: id }),
    });
    if (res.ok) {
      const data = await res.json();
      setProfile(p => p ? { ...p, is_following: data.following, is_followed_by: data.is_followed_by || false } : p);
    } else {
      setProfile(p => p ? { ...p, is_following: wasFollowing, followers_count: wasCount } : p);
      if (res.status === 401) router.push('/login');
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return <div className="h-full flex items-center justify-center text-white/60">User not found</div>;
  }

  const isOwn = currentUser?.id === id;

  return (
    <div className="h-full overflow-y-auto">
      <div className="relative h-48 bg-white/5">
        {profile.cover_photo && (
          <img src={profile.cover_photo} className="w-full h-full object-cover" />
        )}
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="flex items-end gap-4 -mt-16 mb-6 relative z-10">
          {stories.length > 0 ? (
            <button onClick={() => setStoryIndex(0)} className="w-24 h-24 rounded-full p-[3px] bg-gradient-to-tr from-purple-500 to-pink-500 flex-shrink-0">
              <div className="w-full h-full rounded-full border-4 border-black overflow-hidden">
                {profile.avatar ? <img src={profile.avatar} className="w-full h-full object-cover" /> : (
                  <div className="w-full h-full flex items-center justify-center text-white text-3xl font-bold bg-purple-500">
                    {profile.display_name?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
              </div>
            </button>
          ) : (
            <div className="w-24 h-24 rounded-full bg-purple-500 border-4 border-black overflow-hidden flex-shrink-0">
              {profile.avatar ? (
                <img src={profile.avatar} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white text-3xl font-bold">
                  {profile.display_name?.[0]?.toUpperCase() || 'U'}
                </div>
              )}
            </div>
          )}
          <div className="pt-14">
            <h1 className="text-xl font-bold">{profile.display_name}</h1>
            <p className="text-white/50">@{profile.username}</p>
            {profile.bio && <p className="text-white/70 text-sm mt-1">{profile.bio}</p>}
            {profile.wallet_address && (
              <p className="text-green-400/70 text-xs mt-1">
                Wallet: {profile.wallet_address.slice(0, 6)}...{profile.wallet_address.slice(-4)}
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-6 mb-6">
          <div className="text-center">
            <p className="text-xl font-bold">{profile.videos_count || 0}</p>
            <p className="text-white/50 text-sm">Videos</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold">{profile.followers_count || 0}</p>
            <p className="text-white/50 text-sm">Followers</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold">{profile.following_count || 0}</p>
            <p className="text-white/50 text-sm">Following</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold">{profile.likes_received_count || 0}</p>
            <p className="text-white/50 text-sm">Likes</p>
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          {isOwn ? (
            <Link
              href="/edit-profile"
              className="flex-1 py-2 rounded-lg font-semibold bg-white/10 text-white text-center text-sm"
            >
              Edit Profile
            </Link>
          ) : (
            <>
              <button
                onClick={handleFollow}
                className={`flex-1 py-2 rounded-lg font-semibold ${
                  profile.is_following && profile.is_followed_by ? 'bg-green-600 text-white' : (profile.is_following ? 'bg-white/10 text-white' : (profile.is_followed_by ? 'bg-purple-600 text-white' : 'bg-red-500 text-white'))
                }`}
              >
                {profile.is_following && profile.is_followed_by ? 'Friends' : (profile.is_following ? 'Following' : (profile.is_followed_by ? 'Follow Back' : 'Follow'))}
              </button>

              <Link
                href={`/messages/${id}`}
                className="px-4 py-2 rounded-lg font-semibold bg-white/10 text-white flex items-center gap-1"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Message
              </Link>
            </>
          )}
        </div>

        <div className="flex border-b border-white/10 mb-4">
          <button
            onClick={() => setTab('videos')}
            className={`flex-1 py-2 text-center text-sm font-semibold border-b-2 transition ${
              tab === 'videos' ? 'border-purple-500 text-white' : 'border-transparent text-white/50'
            }`}
          >
            Videos
          </button>
          <button
            onClick={() => setTab('likes')}
            className={`flex-1 py-2 text-center text-sm font-semibold border-b-2 transition ${
              tab === 'likes' ? 'border-purple-500 text-white' : 'border-transparent text-white/50'
            }`}
          >
            Likes
          </button>
          {isOwn && (
            <button
              onClick={() => setTab('saved')}
              className={`flex-1 py-2 text-center text-sm font-semibold border-b-2 transition ${
                tab === 'saved' ? 'border-purple-500 text-white' : 'border-transparent text-white/50'
              }`}
            >
              Saved
            </button>
          )}
          <button
            onClick={() => setTab('nfts')}
            className={`flex-1 py-2 text-center text-sm font-semibold border-b-2 transition ${
              tab === 'nfts' ? 'border-purple-500 text-white' : 'border-transparent text-white/50'
            }`}
          >
            NFTs
          </button>
        </div>

        {videos.length === 0 ? (
          <p className="text-white/40 text-center py-8">No videos yet</p>
        ) : (
          <div className="grid grid-cols-3 gap-1">
            {videos.map(v => (
              <div key={v.id} className="aspect-[9/16] bg-white/5 rounded overflow-hidden relative group">
                <Link href="/" className="block w-full h-full">
                  <video src={v.file_path} className="w-full h-full object-cover" />
                </Link>
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-center justify-center pointer-events-none">
                  <div className="flex items-center gap-3 text-white opacity-0 group-hover:opacity-100 transition pointer-events-none">
                    <span>❤️ {v.likes_count}</span>
                    <span>💬 {v.comments_count}</span>
                  </div>
                </div>
                {isOwn && (
                  <button
                    onClick={async () => {
                      if (!confirm('Delete this video?')) return;
                      await fetch(`/api/videos/${v.id}`, { method: 'DELETE' });
                      setVideos(prev => prev.filter(x => x.id !== v.id));
                    }}
                    className="absolute top-1 right-1 w-7 h-7 bg-red-500/80 hover:bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition pointer-events-auto"
                  >
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {storyIndex !== null && (
        <StoryViewer
          stories={stories}
          initialIndex={storyIndex}
          currentUserId={currentUser?.id}
          onClose={() => setStoryIndex(null)}
        />
      )}
    </div>
  );
}
