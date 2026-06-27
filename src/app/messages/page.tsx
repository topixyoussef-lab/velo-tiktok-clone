'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useRealtime } from '@/lib/useRealtime';
import type { Conversation, Notification } from '@/lib/types';

export default function InboxPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'chats' | 'notifications' | 'community'>('chats');
  const [communities, setCommunities] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const router = useRouter();

  const fetchData = useCallback(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (!data.user) router.push('/login');
        else {
          Promise.all([
            fetch('/api/messages/conversations').then(r => r.json()),
            fetch('/api/notifications').then(r => r.json()),
            fetch('/api/communities').then(r => r.json()),
          ]).then(([convData, notifData, commData]) => {
            setConversations(convData.conversations || []);
            setNotifications(notifData.notifications || []);
            setUnreadCount(notifData.unread_count || 0);
            setCommunities(commData.communities || []);
            setLoading(false);
          });
        }
      });
  }, [router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useRealtime('notifications', {
    onNotifications(data) {
      setNotifications(prev => {
        const existing = new Set(prev.map(n => n.id));
        const fresh = data.notifications.filter(n => !existing.has(n.id));
        if (fresh.length === 0) return prev;
        return [...fresh, ...prev];
      });
      setUnreadCount(data.unread_count);
    },
  });

  const createCommunity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || creating) return;
    setCreating(true);
    try {
      const res = await fetch('/api/communities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), description: newDesc.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        router.push(`/community/${data.community.id}`);
      }
    } catch {}
    setCreating(false);
  };

  const markRead = async () => {
    await fetch('/api/notifications/read', { method: 'POST' });
    setUnreadCount(0);
    setNotifications(prev => prev.map(n => ({ ...n, read: 1 })));
  };

  const notificationHref = (n: Notification) => {
    if (n.type === 'follow') return `/profile/${n.actor_id}`;
    if (n.type === 'like' || n.type === 'save' || n.type === 'comment') return `/?video=${n.video_id}`;
    if (n.type.startsWith('story_')) return `/?story=${n.story_id}`;
    return '#';
  };

  const notificationText = (type: string) => {
    switch (type) {
      case 'follow': return 'started following you';
      case 'like': return 'liked your video';
      case 'save': return 'saved your video';
      case 'comment': return 'commented on your video';
      case 'story_view': return 'viewed your story';
      case 'story_like': return 'liked your story';
      case 'story_comment': return 'commented on your story';
      default: return 'interacted with your content';
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
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
        <h1 className="text-xl font-bold">Inbox</h1>
        {tab === 'notifications' && unreadCount > 0 && (
          <button onClick={markRead} className="text-xs text-purple-400 font-semibold">Mark all read</button>
        )}
      </div>

      <div className="flex border-b border-white/10">
        <button onClick={() => setTab('chats')} className={`flex-1 py-2 text-center text-sm font-semibold border-b-2 transition ${tab === 'chats' ? 'border-purple-500 text-white' : 'border-transparent text-white/50'}`}>Chats</button>
        <button onClick={() => setTab('community')} className={`flex-1 py-2 text-center text-sm font-semibold border-b-2 transition ${tab === 'community' ? 'border-purple-500 text-white' : 'border-transparent text-white/50'}`}>Community</button>
        <button onClick={() => setTab('notifications')} className={`flex-1 py-2 text-center text-sm font-semibold border-b-2 transition ${tab === 'notifications' ? 'border-purple-500 text-white' : 'border-transparent text-white/50'}`}>
          Notifications
          {unreadCount > 0 && <span className="ml-1.5 px-1.5 py-0.5 text-[10px] rounded-full bg-red-500 text-white">{unreadCount}</span>}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === 'chats' ? (
          conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-white/40 gap-3">
              <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-lg">No conversations yet</p>
              <p className="text-sm">Go to someone&apos;s profile to send a message</p>
            </div>
          ) : (
            conversations.map(c => (
              <Link key={c.user_id} href={`/messages/${c.user_id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition">
                <div className="w-12 h-12 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                  {c.display_name?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-white font-semibold text-sm">@{c.username}</span>
                    <span className="text-white/40 text-xs">{new Date(c.last_message_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-white/60 text-sm truncate">{c.last_message}</p>
                </div>
                {c.unread > 0 && (
                  <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-white text-xs font-bold">{c.unread}</div>
                )}
              </Link>
            ))
          )
        ) : tab === 'community' ? (
          <div>
            <div className="px-4 py-2 flex gap-2 border-b border-white/5">
              <button onClick={() => setShowCreate(true)} className="flex-1 py-2 rounded-lg bg-purple-600 text-white text-sm font-semibold">+ Create Group</button>
            </div>
            {showCreate && (
              <form onSubmit={createCommunity} className="px-4 py-3 border-b border-white/5 space-y-2">
                <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Group name" className="w-full bg-white/10 text-white px-3 py-2 rounded-lg text-sm outline-none" />
                <input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Description (optional)" className="w-full bg-white/10 text-white px-3 py-2 rounded-lg text-sm outline-none" />
                <div className="flex gap-2">
                  <button type="submit" disabled={!newName.trim() || creating} className="px-4 py-1.5 rounded-lg bg-purple-600 text-white text-sm font-semibold disabled:opacity-50">Create</button>
                  <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-1.5 rounded-lg bg-white/10 text-white text-sm">Cancel</button>
                </div>
              </form>
            )}
            {communities.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-white/40 gap-3 pt-16">
                <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <p className="text-lg">No groups yet</p>
                <p className="text-sm text-center">Create a group or join one to start chatting</p>
              </div>
            ) : (
              communities.map(c => (
                <Link key={c.id} href={`/community/${c.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                    {c.name[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-white font-semibold text-sm">{c.name}</span>
                      <span className="text-white/40 text-xs">{c.member_count} members</span>
                    </div>
                    <p className="text-white/50 text-sm truncate">{c.description || 'No description'}</p>
                  </div>
                </Link>
              ))
            )}
          </div>
        ) : (
          <>
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-white/40 gap-3">
                <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <p className="text-lg">No notifications yet</p>
              </div>
            ) : (
              notifications.map(n => {
                const href = notificationHref(n);
                const inner = (
                  <div className={`flex items-center gap-3 px-4 py-3 ${n.read ? '' : 'bg-white/5'}`}>
                    <div className="w-10 h-10 rounded-full bg-purple-500 overflow-hidden flex-shrink-0">
                      {n.actor_avatar ? <img src={n.actor_avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-white text-sm font-bold">{n.actor_display_name?.[0]?.toUpperCase() || 'U'}</div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm"><span className="font-semibold">@{n.actor_username}</span> {notificationText(n.type)}</p>
                      <p className="text-white/40 text-xs">{new Date(n.created_at).toLocaleDateString()}</p>
                    </div>
                    {!n.read && <div className="w-2 h-2 rounded-full bg-purple-500 flex-shrink-0" />}
                  </div>
                );
                return href === '#' ? <div key={n.id}>{inner}</div> : <Link key={n.id} href={href}>{inner}</Link>;
              })
            )}
          </>
        )}
      </div>
    </div>
  );
}
