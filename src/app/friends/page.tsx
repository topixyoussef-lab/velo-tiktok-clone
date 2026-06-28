'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import VideoCard from '@/components/VideoCard';
import StoryViewer from '@/components/StoryViewer';
import type { Video, Story, User } from '@/lib/types';

export default function FriendsPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [stories, setStories] = useState<Story[]>([]);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const router = useRouter();

  const myStoryIndex = currentUser ? stories.findIndex(s => s.user_id === currentUser.id) : -1;
  const myStory = myStoryIndex >= 0 ? stories[myStoryIndex] : null;
  const friendStories = stories.filter((_, i) => i !== myStoryIndex);

  const fetchData = useCallback(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (!data.user) { router.push('/login'); return; }
        setCurrentUser(data.user);

        fetch('/api/videos/friends')
          .then(res => res.json())
          .then(res => {
            if (Array.isArray(res.videos)) setVideos(res.videos);
            setLoading(false);
          })
          .catch(() => setLoading(false));

        fetch('/api/stories')
          .then(res => res.json())
          .then(res => { if (Array.isArray(res.stories)) setStories(res.stories); })
          .catch(() => {});
      });
  }, [router]);

  useEffect(() => {
    setLoading(true);
    fetchData();

    pollRef.current = setInterval(fetchData, 15000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchData]);

  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const index = Math.round(container.scrollTop / container.clientHeight);
    setActiveIndex(index);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const handleUploadStory = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    await fetch('/api/stories', { method: 'POST', body: formData });
    fetchData();
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="h-full flex flex-col">
      <div className="text-center pt-3 pb-1 bg-black/80 backdrop-blur-md z-10">
        <h1 className="text-sm font-bold text-white">Friends</h1>
      </div>

      <div className="px-3 py-2 bg-black/50">
        <p className="text-[10px] text-white/40 uppercase tracking-wider mb-2 font-semibold">Stories</p>
        <div className="flex gap-3 overflow-x-auto scrollbar-none pb-1">
          {myStory ? (
            <button onClick={() => setViewerIndex(myStoryIndex)} className="flex-shrink-0 group">
              <div className="w-14 h-14 rounded-full p-[2px] bg-gradient-to-tr from-purple-500 to-pink-500">
                <img src={myStory.avatar || '/default-avatar.svg'} className="w-full h-full rounded-full object-cover border-2 border-black" />
              </div>
              <p className="text-[10px] text-white/60 text-center mt-1 truncate w-14">Your story</p>
            </button>
          ) : (
            <button onClick={() => fileInputRef.current?.click()} className="flex-shrink-0 group">
              <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center border-2 border-dashed border-white/30 hover:border-purple-500 transition-colors">
                <svg className="w-6 h-6 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <p className="text-[10px] text-white/60 text-center mt-1 truncate w-14">Add story</p>
            </button>
          )}
          {friendStories.map((story) => (
            <button key={story.id} onClick={() => setViewerIndex(stories.indexOf(story))} className="flex-shrink-0 group">
              <div className="w-14 h-14 rounded-full p-[2px] bg-gradient-to-tr from-purple-500 to-pink-500">
                <img src={story.avatar || '/default-avatar.svg'} className="w-full h-full rounded-full object-cover border-2 border-black" />
              </div>
              <p className="text-[10px] text-white/60 text-center mt-1 truncate w-14">{story.username}</p>
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : videos.length === 0 && stories.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-white/60 gap-4 px-4">
          <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <p className="text-lg">No friends yet</p>
          <p className="text-sm text-center">Follow people who follow you back to see their stories & videos here</p>
        </div>
      ) : (
        <div ref={containerRef} className="flex-1 overflow-y-auto snap-y snap-mandatory scroll-smooth">
          {videos.map((video, index) => (
            <VideoCard key={video.id} video={video} isActive={index === activeIndex} />
          ))}
        </div>
      )}

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleUploadStory} />

      {viewerIndex !== null && stories.length > 0 && (
        <StoryViewer
          stories={stories}
          initialIndex={viewerIndex}
          currentUserId={currentUser?.id}
          onClose={() => setViewerIndex(null)}
        />
      )}
    </div>
  );
}
