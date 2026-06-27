'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useRealtime } from '@/lib/useRealtime';
import type { Message } from '@/lib/types';

export default function ChatPage() {
  const { id } = useParams<{ id: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [otherUser, setOtherUser] = useState<any>(null);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (!data.user) router.push('/login');
        else if (!cancelled) {
          setCurrentUserId(data.user.id);
          fetch(`/api/messages/${id}`)
            .then(res => res.json())
            .then(d => {
              if (!cancelled) {
                setOtherUser(d.other_user);
                setMessages(d.messages || []);
                setLoading(false);
              }
            });
        }
      });
    return () => { cancelled = true; };
  }, [id, router]);

  useRealtime('messages', {
    onMessages(newMsgs) {
      setMessages(prev => {
        const existing = new Set(prev.map(m => m.id));
        const fresh = newMsgs.filter((m: any) => !existing.has(m.id));
        if (fresh.length === 0) return prev;
        return [...prev, ...fresh].sort((a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      });
    },
  }, `otherId=${id}`);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiver_id: id, text: text.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, data.message]);
        setText('');
      }
    } catch {}
    setSending(false);
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
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-black/80">
        <Link href="/messages" className="text-white/70">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <Link href={`/profile/${id}`} className="flex items-center gap-3 flex-1">
          <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white text-sm font-bold">
            {otherUser?.display_name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div>
            <p className="text-white font-semibold text-sm">{otherUser?.display_name}</p>
            <p className="text-white/50 text-xs">@{otherUser?.username}</p>
          </div>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map(m => (
          <div key={m.id} className={`flex ${m.sender_id === id ? 'justify-start' : 'justify-end'}`}>
            <div className={`max-w-[75%] px-4 py-2 rounded-2xl ${
              m.sender_id === id ? 'bg-white/10 text-white' : 'bg-purple-600 text-white'
            }`}>
              <p className="text-sm">{m.text}</p>
              <p className="text-[10px] text-white/40 mt-1">{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={sendMessage} className="px-4 py-3 border-t border-white/10 flex gap-2">
        <input
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Send a message..."
          className="flex-1 bg-white/10 text-white px-4 py-2 rounded-full text-sm outline-none"
        />
        <button
          type="submit"
          disabled={!text.trim() || sending}
          className="bg-purple-600 text-white px-4 py-2 rounded-full text-sm font-semibold disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
