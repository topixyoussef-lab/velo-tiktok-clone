export interface User {
  id: string;
  username: string;
  display_name: string;
  avatar: string;
  cover_photo: string;
  bio: string;
  country: string;
  age: number | null;
  gender: string;
  wallet_address?: string;
  created_at: string;
  followers_count?: number;
  following_count?: number;
  videos_count?: number;
  likes_count?: number;
  likes_received_count?: number;
  is_following?: boolean;
  is_followed_by?: boolean;
}

export interface Video {
  id: string;
  user_id: string;
  file_path: string;
  thumbnail: string | null;
  caption: string;
  music: string;
  likes_count: number;
  comments_count: number;
  created_at: string;
  username: string;
  display_name: string;
  avatar: string;
  is_own?: boolean;
  saves_count?: number;
  is_nft?: number;
  nft_price?: string;
  nft_owner?: string;
  is_liked: boolean;
  is_saved: boolean;
  is_following?: boolean;
  is_followed_by?: boolean;
}

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  text: string;
  read: number;
  created_at: string;
  sender_username?: string;
  sender_display_name?: string;
  receiver_username?: string;
  receiver_display_name?: string;
}

export interface Conversation {
  user_id: string;
  username: string;
  display_name: string;
  last_message: string;
  last_message_at: string;
  unread: number;
}

export interface Comment {
  id: string;
  user_id: string;
  video_id: string;
  text: string;
  created_at: string;
  username: string;
  display_name: string;
  avatar: string;
}

export interface Story {
  id: string;
  user_id: string;
  file_path: string;
  created_at: string;
  views_count: number;
  likes_count: number;
  comments_count: number;
  username: string;
  display_name: string;
  avatar: string;
  is_liked?: boolean;
}

export interface StoryView {
  id: string;
  user_id: string;
  username: string;
  display_name: string;
  avatar: string;
  created_at: string;
}

export interface StoryComment {
  id: string;
  story_id: string;
  user_id: string;
  text: string;
  created_at: string;
  username: string;
  display_name: string;
  avatar: string;
}

export interface Tip {
  id: string;
  from_user_id: string;
  to_user_id: string;
  video_id: string | null;
  amount: string;
  tx_hash: string;
  created_at: string;
  from_username?: string;
  from_display_name?: string;
}

export interface Notification {
  id: string;
  user_id: string;
  actor_id: string;
  type: 'follow' | 'like' | 'save' | 'comment' | 'story_view' | 'story_like' | 'story_comment';
  video_id: string | null;
  story_id: string | null;
  read: number;
  created_at: string;
  actor_username: string;
  actor_display_name: string;
  actor_avatar: string;
}
