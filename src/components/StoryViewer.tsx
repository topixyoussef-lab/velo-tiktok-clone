'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { Story, StoryView, StoryComment } from '@/lib/types';

export default function StoryViewer({
  stories,
  initialIndex,
  onClose,
  currentUserId,
}: {
  stories: Story[];
  initialIndex: number;
  onClose: () => void;
  currentUserId?: string;
}) {
  const [index, setIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [viewers, setViewers] = useState<StoryView[]>([]);
  const [showViewers, setShowViewers] = useState(false);
  const [comments, setComments] = useState<StoryComment[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [commentsCount, setCommentsCount] = useState(0);
  const pausedRef = useRef(false);
  const pressTimeRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const progressRef = useRef(0);
  const completedRef = useRef(false);
  const viewedRef = useRef(false);
  const commentInputRef = useRef<HTMLInputElement>(null);
  const story = stories[index];

  const startTimer = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      if (pausedRef.current) return;
      progressRef.current += 1;
      setProgress(progressRef.current);
      if (progressRef.current >= 100) {
        clearInterval(intervalRef.current!);
        intervalRef.current = undefined;
      }
    }, 50);
  }, []);

  const goNext = useCallback(() => {
    setIndex(i => {
      if (i + 1 < stories.length) return i + 1;
      return i;
    });
  }, [stories.length]);

  useEffect(() => {
    if (index === stories.length - 1 && progress >= 100 && !completedRef.current) {
      completedRef.current = true;
      onClose();
    }
  }, [index, progress, stories.length, onClose]);

  useEffect(() => {
    progressRef.current = 0;
    setProgress(0);
    completedRef.current = false;
    viewedRef.current = false;
    startTimer();
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [index, startTimer]);

  useEffect(() => {
    const s = stories[index];
    if (!s) return;
    setLiked(!!s.is_liked);
    setLikesCount(s.likes_count || 0);
    setCommentsCount(s.comments_count || 0);
    setViewers([]);
    setComments([]);
    setShowViewers(false);
    setShowComments(false);
    if (!viewedRef.current) {
      viewedRef.current = true;
      fetch(`/api/stories/${s.id}/view`, { method: 'POST' }).catch(() => {});
    }
  }, [index, stories]);

  useEffect(() => {
    if (progress >= 100 && !completedRef.current) {
      completedRef.current = true;
      goNext();
    }
  }, [progress, goNext]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'ArrowLeft' && index > 0) { setIndex(i => i - 1); return; }
      if (e.key === 'ArrowRight' && index < stories.length - 1) { setIndex(i => i + 1); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [index, stories.length, onClose]);

  if (!story) return null;

  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input')) return;
    pressTimeRef.current = Date.now();
    pausedRef.current = true;
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input')) return;
    const elapsed = Date.now() - pressTimeRef.current;
    pausedRef.current = false;
    startTimer();
    if (elapsed < 200) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      if (x < rect.width * 0.3 && index > 0) setIndex(i => i - 1);
      else if (x > rect.width * 0.7 && index < stories.length - 1) setIndex(i => i + 1);
      else onClose();
    }
  };

  const [replyTo, setReplyTo] = useState<{ id: string; username: string } | null>(null);

  const sendComment = async () => {
    const input = commentInputRef.current;
    if (!input || !input.value.trim()) return;
    const text = input.value.trim();
    input.value = '';
    input.disabled = true;
    try {
      const body: any = { text };
      if (replyTo) body.parent_id = replyTo.id;
      const res = await fetch(`/api/stories/${story.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.comment) {
        setComments(prev => [data.comment, ...prev]);
        setCommentsCount(c => c + 1);
        setReplyTo(null);
      } else input.value = text;
    } catch { input.value = text; }
    input.disabled = false;
    input.focus();
  };

  const deleteStoryComment = async (commentId: string) => {
    try {
      const res = await fetch(`/api/stories/${story.id}/comments/${commentId}`, { method: 'DELETE' });
      if (res.ok) {
        setComments(prev => prev.filter(c => c.id !== commentId));
        setCommentsCount(c => Math.max(0, c - 1));
      }
    } catch {}
  };

  const toggleStoryCommentLike = async (commentId: string) => {
    try {
      const res = await fetch(`/api/stories/${story.id}/comments/${commentId}/like`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setComments(prev => prev.map(c =>
          c.id === commentId
            ? { ...c, is_liked: data.liked, likes_count: c.likes_count + (data.liked ? 1 : -1) }
            : c
        ));
      }
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
      <div
        className="relative w-full max-w-lg h-full max-h-[90vh] flex flex-col select-none"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => { pausedRef.current = false; startTimer(); }}
      >
        <div className="flex gap-1 p-2">
          {stories.map((s, i) => (
            <div key={s.id} className="flex-1 h-0.5 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-white transition-all duration-100" style={{ width: i < index ? '100%' : i === index ? `${progress}%` : '0%' }} />
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3 px-4 py-2">
          <img src={story.avatar || '/default-avatar.svg'} className="w-9 h-9 rounded-full border-2 border-purple-500 object-cover" />
          <span className="text-white font-semibold text-sm">{story.username}</span>
          <button onClick={e => { e.stopPropagation(); fetch(`/api/stories/${story.id}`, { method: 'DELETE' }).then(r => r.ok && onClose()); }} className="text-white/40 hover:text-red-400 ml-auto">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
          <button onClick={e => { e.stopPropagation(); onClose(); }} className="text-white/60 hover:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center p-4">
          <img src={story.file_path} className="max-w-full max-h-full object-contain rounded-lg pointer-events-none" />
        </div>

        <div className="flex items-center gap-5 px-6 py-4">
          <button onClick={e => { e.stopPropagation(); fetch(`/api/stories/${story.id}/like`, { method: 'POST' }).then(r => r.json()).then(d => { if (d.liked !== undefined) { setLiked(d.liked); setLikesCount(c => d.liked ? c + 1 : Math.max(0, c - 1)); } }); }} className="flex items-center gap-1.5 text-white/60 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill={liked ? '#ec4899' : 'none'} stroke={liked ? '#ec4899' : 'currentColor'} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <span className="text-xs">{likesCount}</span>
          </button>
          <button onClick={e => { e.stopPropagation(); fetch(`/api/stories/${story.id}/comments`).then(r => r.json()).then(d => { setComments(d.comments || []); setShowComments(true); }); pausedRef.current = true; if (intervalRef.current) clearInterval(intervalRef.current); setTimeout(() => commentInputRef.current?.focus(), 100); }} className="flex items-center gap-1.5 text-white/60 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
            <span className="text-xs">{commentsCount}</span>
          </button>
          {story.user_id === currentUserId && (
            <button onClick={e => { e.stopPropagation(); fetch(`/api/stories/${story.id}/views`).then(r => r.json()).then(d => setViewers(d.viewers || [])); setShowViewers(true); pausedRef.current = true; if (intervalRef.current) clearInterval(intervalRef.current); }} className="flex items-center gap-1.5 text-white/60 hover:text-white transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
              <span className="text-xs">{story.views_count || 0}</span>
            </button>
          )}
        </div>

        {showViewers && (
          <div className="absolute inset-0 bg-black/80 flex flex-col z-10" onClick={() => { setShowViewers(false); pausedRef.current = false; startTimer(); }}>
            <div className="flex items-center justify-between p-4 border-b border-white/10" onClick={e => e.stopPropagation()}>
              <h3 className="text-white font-semibold">Views ({viewers.length})</h3>
              <button onClick={() => { setShowViewers(false); pausedRef.current = false; startTimer(); }} className="text-white/60 hover:text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4" onClick={e => e.stopPropagation()}>
              {viewers.length === 0 ? (
                <p className="text-white/40 text-center mt-10">No views yet</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {viewers.map(v => (
                    <div key={v.user_id} className="flex items-center gap-3">
                      <img src={v.avatar || '/default-avatar.svg'} className="w-10 h-10 rounded-full object-cover" />
                      <div>
                        <p className="text-white text-sm font-medium">{v.display_name}</p>
                        <p className="text-white/40 text-xs">@{v.username}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {showComments && (
          <div className="absolute inset-0 bg-black/90 flex flex-col z-10" onClick={() => { setShowComments(false); pausedRef.current = false; startTimer(); setReplyTo(null); }}>
            <div className="flex items-center justify-between p-4 border-b border-white/10" onClick={e => e.stopPropagation()}>
              <h3 className="text-white font-semibold">Comments ({commentsCount})</h3>
              <button onClick={() => { setShowComments(false); pausedRef.current = false; startTimer(); setReplyTo(null); }} className="text-white/60 hover:text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4" onClick={e => e.stopPropagation()}>
              {comments.length === 0 ? (
                <p className="text-white/40 text-center mt-10">No comments yet</p>
              ) : (
                (() => {
                  const parents = comments.filter(c => !c.parent_id);
                  return parents.map(pc => {
                    const replies = comments.filter(c => c.parent_id === pc.id);
                    return (
                      <div key={pc.id} className="mb-3">
                        <StoryCommentItem
                          comment={pc}
                          currentUserId={currentUserId}
                          onDelete={deleteStoryComment}
                          onLike={toggleStoryCommentLike}
                          onReply={(id, username) => { setReplyTo({ id, username }); commentInputRef.current?.focus(); }}
                        />
                        {replies.length > 0 && (
                          <div className="ml-10 mt-1 space-y-1 border-l-2 border-white/10 pl-3">
                            {replies.map(r => (
                              <StoryCommentItem
                                key={r.id}
                                comment={r}
                                currentUserId={currentUserId}
                                onDelete={deleteStoryComment}
                                onLike={toggleStoryCommentLike}
                                onReply={(id, username) => { setReplyTo({ id, username }); commentInputRef.current?.focus(); }}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  });
                })()
              )}
            </div>
            <div className="p-3 border-t border-white/10" onClick={e => e.stopPropagation()}>
              {replyTo && (
                <div className="flex items-center gap-2 text-xs text-purple-400 mb-2">
                  <span>Replying to @{replyTo.username}</span>
                  <button type="button" onClick={() => setReplyTo(null)} className="text-white/40 hover:text-white ml-auto">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              )}
              <div className="flex gap-2">
                <input
                  ref={commentInputRef}
                  onKeyDown={e => { if (e.key === 'Enter') sendComment(); }}
                  placeholder={replyTo ? `Reply to @${replyTo.username}...` : 'Add a comment...'}
                  className="flex-1 bg-white/10 text-white text-sm rounded-full px-4 py-2 outline-none placeholder-white/30"
                />
                <button onClick={sendComment} className="text-purple-400 font-semibold text-sm px-2">Send</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StoryCommentItem({ comment, currentUserId, onDelete, onLike, onReply }: {
  comment: any;
  currentUserId?: string;
  onDelete: (id: string) => void;
  onLike: (id: string) => void;
  onReply: (id: string, username: string) => void;
}) {
  return (
    <div className="flex gap-2 group">
      <img src={comment.avatar || '/default-avatar.svg'} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm break-words"><span className="font-semibold">{comment.username}</span> {comment.text}</p>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-white/30 text-[10px]">{new Date(comment.created_at).toLocaleDateString()}</span>
          <button onClick={() => onLike(comment.id)} className="flex items-center gap-0.5 text-white/40 hover:text-pink-400 text-[10px] transition-colors">
            <svg className="w-3 h-3" fill={comment.is_liked ? '#ec4899' : 'none'} stroke={comment.is_liked ? '#ec4899' : 'currentColor'} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            {comment.likes_count > 0 && <span>{comment.likes_count}</span>}
          </button>
          <button onClick={() => onReply(comment.id, comment.username)} className="text-white/40 hover:text-purple-400 text-[10px] transition-colors">Reply</button>
          {currentUserId === comment.user_id && (
            <button onClick={() => onDelete(comment.id)} className="text-white/40 hover:text-red-400 text-[10px] ml-auto transition-colors">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
