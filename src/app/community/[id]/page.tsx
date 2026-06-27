'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useRealtime } from '@/lib/useRealtime';

export default function CommunityPage() {
  const { id } = useParams<{ id: string }>();
  const [community, setCommunity] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [adding, setAdding] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (!data.user) { router.push('/login'); return; }
        Promise.all([
          fetch(`/api/communities/${id}`).then(r => r.json()),
          fetch(`/api/community?community_id=${id}`).then(r => r.json()),
        ]).then(([commData, msgData]) => {
          if (!commData.community) { router.push('/messages'); return; }
          setCommunity(commData.community);
          setMembers(commData.members || []);
          setMessages(msgData.messages || []);
          setLoading(false);
        });
      });
  }, [id, router]);

  useRealtime('community', {
    onCommunity(newMsgs) {
      setMessages(prev => {
        const existing = new Set(prev.map(m => m.id));
        const fresh = newMsgs.filter((m: any) => !existing.has(m.id));
        if (fresh.length === 0) return prev;
        return [...prev, ...fresh];
      });
    },
  }, `community_id=${id}`);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch('/api/community', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim(), community_id: id }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, data.message]);
        setText('');
      }
    } catch {}
    setSending(false);
  };

  const searchUsers = async (q: string) => {
    setSearchQuery(q);
    if (!q.trim()) { setSearchResults([]); return; }
    const res = await fetch(`/api/users/suggestions?q=${encodeURIComponent(q)}`);
    if (res.ok) {
      const data = await res.json();
      setSearchResults(data.users || []);
    }
  };

  const addMember = async (userId: string) => {
    setAdding(true);
    await fetch(`/api/communities/${id}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId }),
    });
    fetch(`/api/communities/${id}`).then(r => r.json()).then(d => {
      setMembers(d.members || []);
      setCommunity(d.community);
    });
    setAdding(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const removeMember = async (userId: string) => {
    await fetch(`/api/communities/${id}/members?user_id=${userId}`, { method: 'DELETE' });
    fetch(`/api/communities/${id}`).then(r => r.json()).then(d => {
      setMembers(d.members || []);
      setCommunity(d.community);
    });
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!community) return null;

  const isAdmin = community.my_role === 'admin';

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-black/80">
        <Link href="/messages" className="text-white/70">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm truncate">{community.name}</p>
          <p className="text-white/50 text-xs">{community.member_count} members</p>
        </div>
        <button onClick={() => setShowMembers(!showMembers)} className="text-white/70">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        </button>
      </div>

      {showMembers && (
        <div className="border-b border-white/10 bg-black/60 max-h-48 overflow-y-auto">
          <div className="px-4 py-2 space-y-1">
            {isAdmin && (
              <div className="flex gap-2 pb-2 border-b border-white/10 mb-1">
                <input
                  value={searchQuery}
                  onChange={e => searchUsers(e.target.value)}
                  placeholder="Add people by username..."
                  className="flex-1 bg-white/10 text-white px-3 py-1.5 rounded-full text-xs outline-none"
                />
              </div>
            )}
            {searchResults.map(u => (
              <button
                key={u.id}
                onClick={() => addMember(u.id)}
                disabled={adding}
                className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-white/5 rounded text-left text-sm"
              >
                <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center text-white text-[9px] font-bold">
                  {u.display_name?.[0]?.toUpperCase() || 'U'}
                </div>
                <span className="text-white/80">@{u.username}</span>
                <span className="ml-auto text-purple-400 text-xs">+ Add</span>
              </button>
            ))}
            {members.map(m => (
              <div key={m.id} className="flex items-center gap-2 px-2 py-1.5">
                <div className="w-6 h-6 rounded-full bg-purple-500 overflow-hidden flex-shrink-0">
                  {m.avatar ? (
                    <img src={m.avatar} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white text-[9px] font-bold">
                      {m.display_name?.[0]?.toUpperCase() || 'U'}
                    </div>
                  )}
                </div>
                <span className="text-white/80 text-sm flex-1">@{m.username}</span>
                {m.role === 'admin' && <span className="text-purple-400 text-[10px] font-semibold">Admin</span>}
                {isAdmin && m.role !== 'admin' && (
                  <button onClick={() => removeMember(m.user_id)} className="text-red-400 text-xs">Remove</button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.map(m => (
          <Link key={m.id} href={`/profile/${m.user_id}`} className="flex items-start gap-2 hover:bg-white/[0.02] rounded-lg px-2 py-1 -mx-2 transition">
            <div className="w-7 h-7 rounded-full bg-purple-500 overflow-hidden flex-shrink-0 mt-0.5">
              {m.avatar ? (
                <img src={m.avatar} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white text-[10px] font-bold">
                  {m.display_name?.[0]?.toUpperCase() || 'U'}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-white font-semibold text-xs">@{m.username}</span>{' '}
              <span className="text-white/80 text-sm">{m.text}</span>
              <p className="text-[10px] text-white/30">{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </Link>
        ))}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={sendMessage} className="px-3 py-2 border-t border-white/10 flex gap-2">
        <input
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Message the group..."
          className="flex-1 bg-white/10 text-white px-3 py-1.5 rounded-full text-sm outline-none"
        />
        <button
          type="submit"
          disabled={!text.trim() || sending}
          className="bg-purple-600 text-white px-4 py-1.5 rounded-full text-sm font-semibold disabled:opacity-50"
        >Send</button>
      </form>
    </div>
  );
}
