import Database from 'better-sqlite3';
import path from 'path';
import { dataDir } from './paths';

const dbPath = path.join(dataDir, 'data.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('ignore_check_constraints = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    password TEXT NOT NULL,
    avatar TEXT DEFAULT '',
    cover_photo TEXT DEFAULT '',
    bio TEXT DEFAULT '',
    country TEXT DEFAULT '',
    age INTEGER DEFAULT NULL,
    gender TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS videos (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    file_path TEXT NOT NULL,
    thumbnail TEXT,
    caption TEXT DEFAULT '',
    music TEXT DEFAULT '',
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS likes (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    video_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (video_id) REFERENCES videos(id),
    UNIQUE(user_id, video_id)
  );

  CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    video_id TEXT NOT NULL,
    text TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (video_id) REFERENCES videos(id)
  );

  CREATE TABLE IF NOT EXISTS follows (
    id TEXT PRIMARY KEY,
    follower_id TEXT NOT NULL,
    following_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (follower_id) REFERENCES users(id),
    FOREIGN KEY (following_id) REFERENCES users(id),
    UNIQUE(follower_id, following_id)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    sender_id TEXT NOT NULL,
    receiver_id TEXT NOT NULL,
    text TEXT NOT NULL,
    read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id),
    FOREIGN KEY (receiver_id) REFERENCES users(id)
  );
`);

try { db.exec("ALTER TABLE users ADD COLUMN cover_photo TEXT DEFAULT ''"); } catch {}

db.exec(`
  CREATE TABLE IF NOT EXISTS saved_videos (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    video_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (video_id) REFERENCES videos(id),
    UNIQUE(user_id, video_id)
  );
`);

try { db.exec("ALTER TABLE videos ADD COLUMN saves_count INTEGER DEFAULT 0"); } catch {}
try { db.exec("ALTER TABLE users ADD COLUMN wallet_address TEXT DEFAULT ''"); } catch {}
try { db.exec("ALTER TABLE stories ADD COLUMN views_count INTEGER DEFAULT 0"); } catch {}
try { db.exec("ALTER TABLE stories ADD COLUMN likes_count INTEGER DEFAULT 0"); } catch {}
try { db.exec("ALTER TABLE stories ADD COLUMN comments_count INTEGER DEFAULT 0"); } catch {}
try { db.exec("ALTER TABLE notifications ADD COLUMN story_id TEXT DEFAULT ''"); } catch {}
try { db.exec("ALTER TABLE videos ADD COLUMN is_nft INTEGER DEFAULT 0"); } catch {}
try { db.exec("ALTER TABLE videos ADD COLUMN nft_price TEXT DEFAULT ''"); } catch {}
try { db.exec("ALTER TABLE videos ADD COLUMN nft_owner TEXT DEFAULT ''"); } catch {}
try { db.exec("ALTER TABLE users ADD COLUMN country TEXT DEFAULT ''"); } catch {}
try { db.exec("ALTER TABLE users ADD COLUMN age INTEGER DEFAULT NULL"); } catch {}
try { db.exec("ALTER TABLE users ADD COLUMN gender TEXT DEFAULT ''"); } catch {}
try { db.exec("ALTER TABLE community_messages ADD COLUMN community_id TEXT DEFAULT ''"); } catch {}

db.exec(`
  CREATE TABLE IF NOT EXISTS communities (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    avatar TEXT DEFAULT '',
    created_by TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS community_members (
    id TEXT PRIMARY KEY,
    community_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member',
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (community_id) REFERENCES communities(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(community_id, user_id)
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS stories (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    file_path TEXT NOT NULL,
    views_count INTEGER DEFAULT 0,
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS story_views (
    id TEXT PRIMARY KEY,
    story_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (story_id) REFERENCES stories(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(story_id, user_id)
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS story_likes (
    id TEXT PRIMARY KEY,
    story_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (story_id) REFERENCES stories(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(story_id, user_id)
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS story_comments (
    id TEXT PRIMARY KEY,
    story_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    text TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (story_id) REFERENCES stories(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS tips (
    id TEXT PRIMARY KEY,
    from_user_id TEXT NOT NULL,
    to_user_id TEXT NOT NULL,
    video_id TEXT,
    amount TEXT NOT NULL,
    platform_amount TEXT DEFAULT '0',
    creator_amount TEXT DEFAULT '0',
    tx_hash TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (from_user_id) REFERENCES users(id),
    FOREIGN KEY (to_user_id) REFERENCES users(id)
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    actor_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('follow', 'like', 'save', 'comment', 'story_view', 'story_like', 'story_comment')),
    video_id TEXT,
    read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (actor_id) REFERENCES users(id),
    FOREIGN KEY (video_id) REFERENCES videos(id)
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS community_messages (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    text TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

export default db;
