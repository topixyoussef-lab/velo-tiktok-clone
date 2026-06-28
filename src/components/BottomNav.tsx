'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useRealtime } from '@/lib/useRealtime';
import type { User } from '@/lib/types';

export default function BottomNav() {
  const [user, setUser] = useState<User | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const pathname = usePathname();

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => setUser(data.user))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch('/api/notifications')
      .then(res => res.json())
      .then(d => setUnreadCount(d.unread_count || 0))
      .catch(() => {});
  }, []);

  useRealtime('unread', {
    onUnread(data) {
      setUnreadCount(data.unread_count);
    },
  });

  if (!user) return null;

  const isActive = (path: string) => pathname === path ? 'text-white' : 'text-[var(--text-secondary)]';

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[100] bg-[var(--bg-app)]/95 backdrop-blur-md border-t border-[var(--border-color)]">
      <div className="flex items-center justify-around h-14">
        <Link href="/" className={`flex flex-col items-center gap-0.5 ${isActive('/')}`}>
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
          </svg>
          <span className="text-[10px]">Home</span>
        </Link>

        <Link href="/friends" className={`flex flex-col items-center gap-0.5 ${isActive('/friends')}`}>
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
          </svg>
          <span className="text-[10px]">Friends</span>
        </Link>

        <Link href="/upload" className="flex flex-col items-center gap-0.5">
          <div className="w-11 h-11 rounded-full bg-red-500 flex items-center justify-center -mt-3 shadow-lg shadow-red-500/30 hover:shadow-xl hover:shadow-red-500/50 transition-shadow duration-200">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
          </div>
        </Link>

        <Link href="/messages" className={`flex flex-col items-center gap-0.5 relative ${isActive('/messages')}`}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span className="text-[10px]">Inbox</span>
          {unreadCount > 0 && (
            <div className="absolute -top-0.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 flex items-center justify-center text-[9px] text-white font-bold">
              {unreadCount > 9 ? '9+' : unreadCount}
            </div>
          )}
        </Link>

        <Link href={`/profile/${user.id}`} className={`flex flex-col items-center gap-0.5 ${isActive(`/profile/${user.id}`)}`}>
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          </svg>
          <span className="text-[10px]">Profile</span>
        </Link>
      </div>
    </nav>
  );
}
