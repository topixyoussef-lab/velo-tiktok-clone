'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import VideoCard from './VideoCard';
import StoryViewer from './StoryViewer';
import type { Video, Story } from '@/lib/types';

type Tab = 'foryou' | 'following';

export default function VideoFeed() {
  const [tab, setTab] = useState<Tab>('foryou');
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>();
  const [storyOverlay, setStoryOverlay] = useState<{ stories: Story[]; index: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const handledVideoRef = useRef<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  const fetchVideos = useCallback((t: Tab) => {
    const endpoint = t === 'following' ? '/api/videos/following' : '/api/videos/feed';
    fetch(endpoint)
      .then(res => res.json())
      .then(data => {
        setVideos(data.videos || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.user) setCurrentUserId(data.user.id);
      });
  }, []);

  useEffect(() => {
    setLoading(true);
    setActiveIndex(0);
    if (containerRef.current) containerRef.current.scrollTop = 0;
    fetchVideos(tab);

    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => fetchVideos(tab), 3000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [tab, fetchVideos]);

  const videoParam = searchParams?.get('video');
  const storyParam = searchParams?.get('story');

  useEffect(() => {
    if (!videoParam) return;
    if (handledVideoRef.current === videoParam) return;
    const idx = videos.findIndex(v => v.id === videoParam);
    if (idx >= 0) {
      const container = containerRef.current;
      if (container) {
        container.scrollTop = idx * container.clientHeight;
        setActiveIndex(idx);
      }
      handledVideoRef.current = videoParam;
      setLoading(false);
    } else {
      fetch(`/api/videos/${videoParam}`)
        .then(res => res.json())
        .then(data => {
          if (data.video) {
            setVideos(prev => [data.video, ...prev.filter(v => v.id !== videoParam)]);
            setTimeout(() => {
              const container = containerRef.current;
              if (container) {
                container.scrollTop = 0;
                setActiveIndex(0);
              }
            }, 100);
            handledVideoRef.current = videoParam;
          }
        })
        .catch(() => {});
      setLoading(false);
    }
  }, [videoParam, videos]);

  useEffect(() => {
    if (!storyParam) return;
    fetch('/api/stories')
      .then(res => res.json())
      .then(data => {
        const allStories = data.stories || [];
        const idx = allStories.findIndex((s: Story) => s.id === storyParam);
        if (idx >= 0) setStoryOverlay({ stories: allStories, index: idx });
      })
      .catch(() => {});
  }, [storyParam]);

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

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-center gap-6 pt-2 pb-1 bg-black/80 backdrop-blur-md z-10">
        <button
          onClick={() => setTab('foryou')}
          className={`text-sm font-semibold pb-1 border-b-2 transition ${
            tab === 'foryou' ? 'text-white border-white' : 'text-white/40 border-transparent'
          }`}
        >
          For You
        </button>
        <button
          onClick={() => setTab('following')}
          className={`text-sm font-semibold pb-1 border-b-2 transition ${
            tab === 'following' ? 'text-white border-white' : 'text-white/40 border-transparent'
          }`}
        >
          Following
        </button>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : videos.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-white/60 gap-4 px-4">
          <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          {tab === 'following' ? (
            <>
              <p className="text-lg">No videos from people you follow</p>
              <p className="text-sm text-center">Follow some users to see their videos here</p>
            </>
          ) : (
            <>
              <p className="text-xl">No videos yet</p>
              <a href="/upload" className="bg-purple-600 text-white px-6 py-2 rounded-full font-semibold">
                Upload the first video
              </a>
            </>
          )}
        </div>
      ) : (
        <div ref={containerRef} className="flex-1 overflow-y-auto snap-y snap-mandatory scroll-smooth">
          {videos.map((video, index) => (
            <VideoCard key={video.id} video={video} isActive={index === activeIndex} />
          ))}
        </div>
      )}

      {storyOverlay && (
        <StoryViewer
          stories={storyOverlay.stories}
          initialIndex={storyOverlay.index}
          currentUserId={currentUserId}
          onClose={() => { setStoryOverlay(null); router.replace('/', { scroll: false }); }}
        />
      )}
    </div>
  );
}
