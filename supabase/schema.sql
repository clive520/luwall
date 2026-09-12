-- ==========================================================
-- 鹿鳴牆 LuWall - Supabase PostgreSQL Schema
-- 可直接於 Supabase Dashboard > SQL Editor 中整份貼上執行
-- ==========================================================

-- 1. 使用者資料表 (Users)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL DEFAULT 'local',
  username TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student',
  email TEXT,
  avatar_url TEXT,
  password_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 本地註冊帳號唯一索引
CREATE UNIQUE INDEX IF NOT EXISTS users_local_username_idx ON users (username) WHERE provider = 'local';

-- 2. 看板資料表 (Boards)
CREATE TABLE IF NOT EXISTS boards (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  cover_color TEXT DEFAULT 'from-emerald-500 to-teal-700',
  layout_type TEXT DEFAULT 'shelf',
  allow_guest BOOLEAN DEFAULT true,
  is_public BOOLEAN DEFAULT true,
  require_approval BOOLEAN DEFAULT false,
  reaction_type TEXT DEFAULT 'like',
  profanity_filter BOOLEAN DEFAULT true,
  created_by TEXT NOT NULL,
  creator_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 主題分欄資料表 (Sections)
CREATE TABLE IF NOT EXISTS sections (
  id TEXT PRIMARY KEY,
  board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 便籤卡片資料表 (Posts)
CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  section_id TEXT REFERENCES sections(id) ON DELETE SET NULL,
  author_id TEXT,
  author_name TEXT NOT NULL,
  is_author_teacher BOOLEAN DEFAULT false,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  color TEXT DEFAULT '#fef08a',
  attachment JSONB,
  status TEXT DEFAULT 'approved',
  order_index INTEGER DEFAULT 0,
  pos_x NUMERIC,
  pos_y NUMERIC,
  like_count INTEGER DEFAULT 0,
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0,
  star_average NUMERIC DEFAULT 0,
  star_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. 留言資料表 (Comments)
CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  author_id TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. 回饋互動資料表 (Reactions)
CREATE TABLE IF NOT EXISTS reactions (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  value INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 啟用 RLS 安全策略 (允許公開/服務端讀寫)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;

-- 預設公開查詢與寫入政策 (搭配 Service Role Key / API 管理)
CREATE POLICY "Public Read All" ON boards FOR SELECT USING (true);
CREATE POLICY "Public Insert All" ON boards FOR ALL USING (true);

CREATE POLICY "Public Read All Sections" ON sections FOR SELECT USING (true);
CREATE POLICY "Public Insert All Sections" ON sections FOR ALL USING (true);

CREATE POLICY "Public Read All Posts" ON posts FOR SELECT USING (true);
CREATE POLICY "Public Insert All Posts" ON posts FOR ALL USING (true);

CREATE POLICY "Public Read All Comments" ON comments FOR SELECT USING (true);
CREATE POLICY "Public Insert All Comments" ON comments FOR ALL USING (true);

CREATE POLICY "Public Read All Reactions" ON reactions FOR SELECT USING (true);
CREATE POLICY "Public Insert All Reactions" ON reactions FOR ALL USING (true);

CREATE POLICY "Public Read All Users" ON users FOR SELECT USING (true);
CREATE POLICY "Public Insert All Users" ON users FOR ALL USING (true);

-- ==========================================================
-- 種子預設資料 (若不存在則插入超級管理員 admin 與範例看板)
-- ==========================================================
INSERT INTO users (id, provider, username, name, role, email, password_hash)
VALUES (
  'super-admin-001',
  'local',
  'admin',
  '超級系統管理員',
  'admin',
  'admin@luyang.edu.tw',
  '$2b$10$S0xJ.fkcJwEXFn7V9gX9u.yr4YSpYvdfhuX6rWfp0ToT2JUtV/Fm6'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO boards (id, title, description, cover_color, layout_type, allow_guest, is_public, require_approval, reaction_type, profanity_filter, created_by, creator_name)
VALUES (
  'demo-stream-board',
  '四年甲班・自然觀察與生活筆記 🌿',
  '同學們好！請挑選相應主題分享你在校園或家裡觀察到的小植物、小昆蟲，可上傳照片、錄音或寫下心得！',
  'from-emerald-500 to-teal-700',
  'shelf',
  true,
  true,
  false,
  'like',
  true,
  'super-admin-001',
  '超級管理員'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO sections (id, board_id, title, order_index)
VALUES 
  ('sec-nature-plants', 'demo-stream-board', '校園植物觀察區 🌿', 0),
  ('sec-nature-insects', 'demo-stream-board', '昆蟲小天地 🐞', 1),
  ('sec-nature-qa', 'demo-stream-board', '心得與提問交流 💬', 2)
ON CONFLICT (id) DO NOTHING;
