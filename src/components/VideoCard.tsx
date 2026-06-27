'use client';

import { useRef, useState, useEffect } from 'react';
import type { Video, Comment } from '@/lib/types';
import { useAccount } from 'wagmi';
import { sendTransaction } from 'wagmi/actions';
import { parseEther } from 'viem';
import { wagmiConfig } from '@/lib/web3/config';
import { playLikeSound, playUnlikeSound, playSaveSound, playFollowSound, playUnfollowSound, playTipSound } from '@/lib/sounds';

const PLATFORM_WALLET = '0x1dBf8cf702a5501E581885d031d4cDC44E5957cb';

interface Props {
  video: Video;
  isActive?: boolean;
}

export default function VideoCard({ video }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [liked, setLiked] = useState(video.is_liked);
  const [likesCount, setLikesCount] = useState(video.likes_count);
  const [showComments, setShowComments] = useState(false);
  const [commentsCount, setCommentsCount] = useState(video.comments_count);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [saved, setSaved] = useState(video.is_saved);
  const [savesCount, setSavesCount] = useState(video.saves_count || 0);
  const [following, setFollowing] = useState(video.is_following || false);
  const [showTipInput, setShowTipInput] = useState(false);
  const [tipAmount, setTipAmount] = useState('0.001');
  const [tipping, setTipping] = useState(false);
  const [isFriend, setIsFriend] = useState(video.is_following && video.is_followed_by || false);
  const [avatarError, setAvatarError] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [heartAnim, setHeartAnim] = useState(false);
  const [saveAnim, setSaveAnim] = useState(false);

  useEffect(() => {
    setLikesCount(video.likes_count);
    setCommentsCount(video.comments_count);
  }, [video.likes_count, video.comments_count]);

  const playVideo = () => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = 0;
    v.play().catch(() => {});
  };

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          playVideo();
          setIsPlaying(true);
        } else {
          videoRef.current?.pause();
          setIsPlaying(false);
        }
      },
      { threshold: 0.6 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // أول click في الصفحة يفك الميوت لكل الفيديوهات
  useEffect(() => {
    const handler = () => {
      setIsMuted(false);
      if (videoRef.current) videoRef.current.muted = false;
    };
    document.addEventListener('click', handler, { once: true });
    return () => document.removeEventListener('click', handler);
  }, []);

  const togglePlay = () => {
    if (isPlaying) {
      videoRef.current?.pause();
    } else {
      playVideo();
    }
    setIsPlaying(!isPlaying);
  };

  const handleLike = async () => {
    const wasLiked = liked;
    const wasCount = likesCount;
    setLiked(!liked);
    setLikesCount(prev => prev + (liked ? -1 : 1));
    setHeartAnim(true);
    if (liked) playUnlikeSound(); else playLikeSound();
    setTimeout(() => setHeartAnim(false), 400);
    try {
      const res = await fetch('/api/likes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video_id: video.id }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.liked === wasLiked) {
          setLiked(data.liked);
          setLikesCount(prev => prev + (data.liked ? 1 : -1));
        }
      } else {
        setLiked(wasLiked);
        setLikesCount(wasCount);
        if (res.status === 401) window.location.href = '/login';
      }
    } catch {
      setLiked(wasLiked);
      setLikesCount(wasCount);
    }
  };

  const toggleComments = async () => {
    if (!showComments) {
      try {
        const res = await fetch(`/api/videos/${video.id}`);
        const data = await res.json();
        setComments(data.comments || []);
      } catch {}
    }
    setShowComments(!showComments);
  };

  const addComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video_id: video.id, text: commentText }),
      });
      if (res.ok) {
        const data = await res.json();
        setComments(prev => [data.comment, ...prev]);
        setCommentsCount(prev => prev + 1);
        setCommentText('');
      } else if (res.status === 401) {
        window.location.href = '/login';
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Error adding comment');
      }
    } catch {}
  };

  const handleSave = async () => {
    const wasSaved = saved;
    const wasCount = savesCount;
    setSaved(!saved);
    setSavesCount(prev => prev + (saved ? -1 : 1));
    setSaveAnim(true);
    playSaveSound();
    setTimeout(() => setSaveAnim(false), 350);
    try {
      const res = await fetch('/api/saves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video_id: video.id }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.saved === wasSaved) {
          setSaved(data.saved);
          setSavesCount(data.saves_count);
        }
      } else {
        setSaved(wasSaved);
        setSavesCount(wasCount);
        if (res.status === 401) window.location.href = '/login';
      }
    } catch {
      setSaved(wasSaved);
      setSavesCount(wasCount);
    }
  };

  const { address, isConnected } = useAccount();

  const handleTip = async () => {
    if (tipping || !isConnected) return;
    setTipping(true);
    try {
      const total = parseEther(tipAmount);
      const half = total / BigInt(2);
      const ownerWallet = (video as any).wallet_address;
      let txHash: string;

      if (ownerWallet) {
        const tx1 = await sendTransaction(wagmiConfig, {
          to: ownerWallet as `0x${string}`,
          value: half,
        });
        const tx2 = await sendTransaction(wagmiConfig, {
          to: PLATFORM_WALLET,
          value: half,
        });
        txHash = `${tx1},${tx2}`;
      } else {
        txHash = await sendTransaction(wagmiConfig, {
          to: PLATFORM_WALLET,
          value: total,
        });
      }

      const platformAmount = ownerWallet ? (Number(tipAmount) / 2).toString() : tipAmount;
      const creatorAmount = ownerWallet ? (Number(tipAmount) / 2).toString() : '0';

      await fetch('/api/tips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to_user_id: video.user_id,
          video_id: video.id,
          amount: tipAmount,
          platform_amount: platformAmount,
          creator_amount: creatorAmount,
          tx_hash: txHash,
        }),
      }).catch(() => {});

      setShowTipInput(false);
      playTipSound();
      alert(`✓ ${tipAmount} ETH sent!\nTx: ${txHash.slice(0, 10)}...${txHash.slice(-6)}`);
    } catch (err: any) {
      if (err?.code === 'ACTION_REJECTED' || err?.message?.includes('rejected')) {
        alert('Transaction cancelled');
      } else {
        alert('Transaction failed: ' + (err?.message || 'Unknown error'));
      }
    }
    setTipping(false);
  };

  const handleMintNFT = async () => {
    const price = prompt('Enter NFT price in ETH:', '0.1');
    if (!price) return;
    try {
      const res = await fetch('/api/nft/mint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video_id: video.id, price }),
      });
      if (res.ok) {
        alert('Video minted as NFT!');
        window.location.reload();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Error minting NFT');
      }
    } catch {
      alert('Error minting NFT');
    }
  };

  const handleFollow = async () => {
    const prev = following;
    const prevFriend = isFriend;
    setFollowing(!following);
    setIsFriend(false);
    if (following) playUnfollowSound(); else playFollowSound();
    try {
      const res = await fetch('/api/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ following_id: video.user_id }),
      });
      if (res.ok) {
        const data = await res.json();
        setFollowing(data.following);
        if (data.is_friend) setIsFriend(true);
      } else {
        setFollowing(prev);
        setIsFriend(prevFriend);
        if (res.status === 401) window.location.href = '/login';
      }
    } catch {
      setFollowing(prev);
      setIsFriend(prevFriend);
    }
  };

  return (
    <div ref={cardRef} className="relative h-full w-full snap-start flex-shrink-0 bg-black">
      <video
        ref={videoRef}
        src={video.file_path}
        className="h-full w-full object-contain cursor-pointer"
        loop
        playsInline
        muted={isMuted}
        onClick={togglePlay}
      />

      {video.is_nft ? (
        <div className="absolute top-4 left-4 z-10 bg-purple-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 hover:bg-purple-500 transition-colors duration-200">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          NFT {video.nft_price ? `• ${video.nft_price} ETH` : ''}
        </div>
      ) : video.is_own ? (
        <button
          onClick={handleMintNFT}
          className="absolute top-4 left-4 z-10 bg-purple-600/80 hover:bg-purple-600 text-white text-[10px] font-bold px-2 py-1 rounded-full transition"
        >
          Mint as NFT
        </button>
      ) : null}

      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <svg className="w-16 h-16 text-white/80" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-4 pb-8">
        <div className="flex items-center gap-2 mb-1">
          <a href={`/profile/${video.user_id}`} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-purple-500 overflow-hidden flex-shrink-0">
              {video.avatar && !avatarError ? (
                <img src={video.avatar} className="w-full h-full object-cover" onError={() => setAvatarError(true)} />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white text-sm font-bold">
                  {video.display_name?.[0]?.toUpperCase() || 'U'}
                </div>
              )}
            </div>
            <span className="text-white font-semibold text-sm">@{video.username}</span>
            </a>
            {!video.is_own && (
              <button
                onClick={handleFollow}
                className={`ml-2 px-3 py-0.5 rounded-full text-xs font-semibold border transition-all duration-200 ${
                  isFriend ? 'border-green-500 text-green-500 hover:shadow-lg hover:shadow-green-500/30' : (following ? 'border-white/50 text-white/70 hover:border-white' : (video.is_followed_by ? 'border-purple-500 text-purple-500 hover:shadow-lg hover:shadow-purple-500/30' : 'border-red-500 text-red-500 hover:shadow-lg hover:shadow-red-500/30'))
                }`}
              >
                {isFriend ? 'Friends' : (following ? 'Following' : (video.is_followed_by ? 'Follow Back' : 'Follow'))}
              </button>
            )}
        </div>
        {video.caption && (
          <p className="text-white text-sm mb-1">{video.caption}</p>
        )}
      </div>

      <div className="absolute right-3 bottom-24 flex flex-col items-center gap-4">
        <button onClick={() => { setIsMuted(!isMuted); if (videoRef.current) videoRef.current.muted = !isMuted; }} className="flex flex-col items-center gap-1">
          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {isMuted ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            )}
          </svg>
        </button>

        <button onClick={handleLike} className="flex flex-col items-center gap-1">
          <svg className={`w-7 h-7 ${liked ? 'text-red-500' : 'text-white'} ${heartAnim ? 'animate-heart-pop' : ''}`} fill={liked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          <span className="text-white text-xs">{likesCount}</span>
        </button>

        <button onClick={toggleComments} className="flex flex-col items-center gap-1">
          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span className="text-white text-xs">{commentsCount}</span>
        </button>

        <button onClick={handleSave} className="flex flex-col items-center gap-1">
          <svg className={`w-7 h-7 ${saved ? 'text-yellow-400' : 'text-white'} ${saveAnim ? 'animate-bookmark-bounce' : ''}`} fill={saved ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
          <span className="text-white text-xs">{savesCount}</span>
        </button>

        <div className="relative flex flex-col items-center">
          <button onClick={() => setShowTipInput(!showTipInput)} className="flex flex-col items-center gap-1">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          {showTipInput && (
            <div className="absolute right-0 bottom-14 bg-gray-900 rounded-xl p-3 border border-white/10 min-w-[180px] shadow-xl" onClick={e => e.stopPropagation()}>
              <p className="text-white text-xs font-semibold mb-2">Send Tip</p>
              <input
                type="number"
                value={tipAmount}
                onChange={e => setTipAmount(e.target.value)}
                className="w-full bg-white/10 text-white px-2 py-1.5 rounded-lg text-sm outline-none mb-2"
                placeholder="0.001"
                step="0.001"
                min="0"
              />
              <button
                onClick={handleTip}
                disabled={tipping}
                className="w-full bg-purple-600 text-white text-xs font-semibold py-1.5 rounded-lg disabled:opacity-50"
              >
                {tipping ? 'Sending...' : `Tip ${tipAmount} ETH`}
              </button>
            </div>
          )}
        </div>
      </div>

      {showComments && (
        <div className="absolute inset-0 bg-black/80 z-10 flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-white/20">
            <h3 className="text-white font-semibold">Comments</h3>
            <button onClick={() => setShowComments(false)} className="text-white/70">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {comments.length === 0 ? (
              <p className="text-white/50 text-center mt-8">No comments yet</p>
            ) : (
              comments.map(c => (
                <div key={c.id} className="flex gap-2">
                  <div className="w-8 h-8 rounded-full bg-purple-500 overflow-hidden flex-shrink-0">
                    {c.avatar ? (
                      <img src={c.avatar} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold">
                        {c.display_name?.[0]?.toUpperCase() || 'U'}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-white text-sm">
                      <span className="font-semibold">@{c.username}</span> {c.text}
                    </p>
                    <p className="text-white/40 text-xs">{new Date(c.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          <form onSubmit={addComment} className="p-4 border-t border-white/20 flex gap-2">
            <input
              type="text"
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              placeholder="Add comment..."
              className="flex-1 bg-white/10 text-white px-3 py-2 rounded-full text-sm outline-none"
            />
            <button type="submit" className="text-purple-400 font-semibold text-sm">Post</button>
          </form>
        </div>
      )}
    </div>
  );
}
