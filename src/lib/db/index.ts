import fs from 'fs';
import path from 'path';
import os from 'os';
import { Board, Post, Comment, Reaction, User, UserRole, Section } from '@/types';

// 在 Serverless (Vercel) 環境中，只有 os.tmpdir() 具備讀寫權限
const DATA_DIR =
  process.env.VERCEL || process.env.NODE_ENV === 'production'
    ? path.join(os.tmpdir(), 'luwall_data')
    : path.join(process.cwd(), '.data');

const BOARDS_FILE = path.join(DATA_DIR, 'boards.json');
const SECTIONS_FILE = path.join(DATA_DIR, 'sections.json');
const POSTS_FILE = path.join(DATA_DIR, 'posts.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const COMMENTS_FILE = path.join(DATA_DIR, 'comments.json');
const REACTIONS_FILE = path.join(DATA_DIR, 'reactions.json');

// 全域記憶體快取
declare global {
  // eslint-disable-next-line no-var
  var __luwall_memory_store__:
    | {
        boards?: Board[];
        sections?: Section[];
        posts?: Post[];
        users?: (User & { passwordHash?: string })[];
        comments?: Comment[];
        reactions?: Reaction[];
      }
    | undefined;
}

if (!globalThis.__luwall_memory_store__) {
  globalThis.__luwall_memory_store__ = {};
}
const memoryStore = globalThis.__luwall_memory_store__;

function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch {
    // 忽略
  }
}

// 預設種子超級管理員帳號 (密碼: admin12345678)
const SUPER_ADMIN_USER: User & { passwordHash?: string } = {
  id: 'super-admin-001',
  provider: 'local',
  username: 'admin',
  name: '超級系統管理員',
  role: 'admin',
  email: 'admin@luyang.edu.tw',
  passwordHash: '$2b$10$S0xJ.fkcJwEXFn7V9gX9u.yr4YSpYvdfhuX6rWfp0ToT2JUtV/Fm6',
  createdAt: new Date().toISOString(),
};

const DEFAULT_USERS: (User & { passwordHash?: string })[] = [
  SUPER_ADMIN_USER,
  {
    id: 'teacher-luyang-001',
    provider: 'luyang_sso',
    username: 'teacher_lin',
    name: '林老師',
    role: 'teacher',
    email: 'teacher@luyang.edu.tw',
    createdAt: new Date().toISOString(),
  },
];

function readJson<T>(file: string, defaultData: T, key: keyof typeof memoryStore): T {
  if (memoryStore[key]) {
    return memoryStore[key] as T;
  }

  ensureDataDir();
  if (fs.existsSync(file)) {
    try {
      const raw = fs.readFileSync(file, 'utf-8');
      const parsed = JSON.parse(raw) as T;
      (memoryStore as Record<string, unknown>)[key] = parsed;
      return parsed;
    } catch {
      // 忽略
    }
  }

  const fallbackFile = path.join(process.cwd(), '.data', path.basename(file));
  if (fs.existsSync(fallbackFile)) {
    try {
      const raw = fs.readFileSync(fallbackFile, 'utf-8');
      const parsed = JSON.parse(raw) as T;
      (memoryStore as Record<string, unknown>)[key] = parsed;
      return parsed;
    } catch {
      // 忽略
    }
  }

  (memoryStore as Record<string, unknown>)[key] = defaultData;
  return defaultData;
}

function writeJson<T>(file: string, data: T, key: keyof typeof memoryStore) {
  (memoryStore as Record<string, unknown>)[key] = data;
  ensureDataDir();
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
  } catch {
    // 忽略
  }
}

const DEFAULT_BOARD: Board = {
  id: 'demo-stream-board',
  title: '四年甲班・自然觀察與生活筆記 🌿',
  description: '同學們好！請挑選相應主題分享你在校園或家裡觀察到的小植物、小昆蟲，可上傳照片、錄音或寫下心得！',
  coverColor: 'from-emerald-500 to-teal-700',
  layoutType: 'shelf',
  allowGuest: true,
  requireApproval: false,
  reactionType: 'like',
  profanityFilter: true,
  createdBy: 'teacher-luyang-001',
  creatorName: '林老師',
  createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
  updatedAt: new Date().toISOString(),
};

// 預設三大主題分類
const DEFAULT_SECTIONS: Section[] = [
  {
    id: 'sec-nature-plants',
    boardId: 'demo-stream-board',
    title: '校園植物觀察區 🌿',
    orderIndex: 0,
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
  {
    id: 'sec-nature-insects',
    boardId: 'demo-stream-board',
    title: '昆蟲小天地 🐞',
    orderIndex: 1,
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
  {
    id: 'sec-nature-qa',
    boardId: 'demo-stream-board',
    title: '心得與提問交流 💬',
    orderIndex: 2,
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
];

const DEFAULT_POSTS: Post[] = [
  {
    id: 'post-1',
    boardId: 'demo-stream-board',
    sectionId: 'sec-nature-qa',
    authorId: 'teacher-luyang-001',
    authorName: '林老師（板主）',
    isAuthorTeacher: true,
    title: '📢 觀察提示與注意事項',
    content: '1. 觀察時請愛護大自然，不要隨意折採植物。\n2. 拍照時注意光線。\n3. 大家可以試著使用「錄音」功能，唸出你的觀察心得喔！',
    color: '#fef08a',
    status: 'approved',
    orderIndex: 0,
    likeCount: 5,
    upvotes: 5,
    downvotes: 0,
    starAverage: 5,
    starCount: 1,
    commentCount: 2,
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'post-2',
    boardId: 'demo-stream-board',
    sectionId: 'sec-nature-insects',
    authorName: '陳小明 (座號 03)',
    title: '操場角落發現的瓢蟲 🐞',
    content: '今天下課在司令台後面的杜鵑花叢葉子上，看到一隻七星瓢蟲！背上的紅色殼好亮，數一數真的有七個黑點點耶。',
    color: '#fed7aa',
    attachment: {
      type: 'image',
      url: 'https://images.unsplash.com/photo-1534067783941-51c9c23ecefd?auto=format&fit=crop&w=600&q=80',
      title: '七星瓢蟲近照',
    },
    status: 'approved',
    orderIndex: 0,
    likeCount: 8,
    upvotes: 8,
    downvotes: 0,
    starAverage: 4.8,
    starCount: 4,
    commentCount: 1,
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'post-3',
    boardId: 'demo-stream-board',
    sectionId: 'sec-nature-plants',
    authorName: '李小華 (座號 12)',
    title: '校門口的大榕樹氣根 🌳',
    content: '大榕樹的氣根垂下來垂到泥土裡，好像好多條鬍鬚一樣！我查了資料，氣根碰觸到泥土後會慢慢變成粗壯的支柱根喔。',
    color: '#bbf7d0',
    attachment: {
      type: 'link',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      title: '榕樹生態短片介紹',
      metadata: {
        youtubeId: 'dQw4w9WgXcQ',
      },
    },
    status: 'approved',
    orderIndex: 0,
    likeCount: 3,
    upvotes: 3,
    downvotes: 0,
    starAverage: 5,
    starCount: 2,
    commentCount: 0,
    createdAt: new Date(Date.now() - 1800000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const db = {
  // Boards
  getBoards: (): Board[] => {
    return readJson<Board[]>(BOARDS_FILE, [DEFAULT_BOARD], 'boards');
  },
  getBoardById: (id: string): Board | undefined => {
    const boards = db.getBoards();
    return boards.find((b) => b.id === id);
  },
  createBoard: (board: Board): Board => {
    const boards = db.getBoards();
    boards.unshift(board);
    writeJson(BOARDS_FILE, boards, 'boards');

    // 建立新看板時，自動為其產生一個預設主題欄位
    db.createSection({
      id: `sec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      boardId: board.id,
      title: '主題討論區 📌',
      orderIndex: 0,
      createdAt: new Date().toISOString(),
    });

    return board;
  },
  updateBoard: (id: string, updates: Partial<Board>): Board | undefined => {
    const boards = db.getBoards();
    const idx = boards.findIndex((b) => b.id === id);
    if (idx === -1) return undefined;
    boards[idx] = { ...boards[idx], ...updates, updatedAt: new Date().toISOString() };
    writeJson(BOARDS_FILE, boards, 'boards');
    return boards[idx];
  },
  deleteBoard: (id: string): boolean => {
    const boards = db.getBoards();
    const filtered = boards.filter((b) => b.id !== id);
    if (filtered.length === boards.length) return false;
    writeJson(BOARDS_FILE, filtered, 'boards');
    return true;
  },

  // Sections (主題分欄)
  getSectionsByBoardId: (boardId: string): Section[] => {
    const allSections = readJson<Section[]>(SECTIONS_FILE, DEFAULT_SECTIONS, 'sections');
    const boardSections = allSections
      .filter((s) => s.boardId === boardId)
      .sort((a, b) => a.orderIndex - b.orderIndex);

    // 若看板沒有任何主題分欄，自動為其補充一個預設欄位
    if (boardSections.length === 0) {
      const defaultSec: Section = {
        id: `sec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        boardId,
        title: '主題一 📌',
        orderIndex: 0,
        createdAt: new Date().toISOString(),
      };
      db.createSection(defaultSec);
      return [defaultSec];
    }

    return boardSections;
  },
  createSection: (section: Section): Section => {
    const allSections = readJson<Section[]>(SECTIONS_FILE, DEFAULT_SECTIONS, 'sections');
    allSections.push(section);
    writeJson(SECTIONS_FILE, allSections, 'sections');
    return section;
  },
  updateSection: (id: string, title: string): Section | undefined => {
    const allSections = readJson<Section[]>(SECTIONS_FILE, DEFAULT_SECTIONS, 'sections');
    const idx = allSections.findIndex((s) => s.id === id);
    if (idx === -1) return undefined;
    allSections[idx].title = title.trim();
    writeJson(SECTIONS_FILE, allSections, 'sections');
    return allSections[idx];
  },
  deleteSection: (id: string): boolean => {
    const allSections = readJson<Section[]>(SECTIONS_FILE, DEFAULT_SECTIONS, 'sections');
    const filtered = allSections.filter((s) => s.id !== id);
    if (filtered.length === allSections.length) return false;
    writeJson(SECTIONS_FILE, filtered, 'sections');
    return true;
  },

  // Posts
  getPostsByBoardId: (boardId: string, includePending = false): Post[] => {
    const posts = readJson<Post[]>(POSTS_FILE, DEFAULT_POSTS, 'posts');
    return posts
      .filter((p) => p.boardId === boardId && (includePending || p.status === 'approved'))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },
  getPostById: (id: string): Post | undefined => {
    const posts = readJson<Post[]>(POSTS_FILE, DEFAULT_POSTS, 'posts');
    return posts.find((p) => p.id === id);
  },
  createPost: (post: Post): Post => {
    const posts = readJson<Post[]>(POSTS_FILE, DEFAULT_POSTS, 'posts');
    posts.unshift(post);
    writeJson(POSTS_FILE, posts, 'posts');
    return post;
  },
  updatePost: (id: string, updates: Partial<Post>): Post | undefined => {
    const posts = readJson<Post[]>(POSTS_FILE, DEFAULT_POSTS, 'posts');
    const idx = posts.findIndex((p) => p.id === id);
    if (idx === -1) return undefined;
    posts[idx] = { ...posts[idx], ...updates, updatedAt: new Date().toISOString() };
    writeJson(POSTS_FILE, posts, 'posts');
    return posts[idx];
  },
  deletePost: (id: string): boolean => {
    const posts = readJson<Post[]>(POSTS_FILE, DEFAULT_POSTS, 'posts');
    const filtered = posts.filter((p) => p.id !== id);
    if (filtered.length === posts.length) return false;
    writeJson(POSTS_FILE, filtered, 'posts');
    return true;
  },

  // Users
  getUsers: (): (User & { passwordHash?: string })[] => {
    const users = readJson<(User & { passwordHash?: string })[]>(USERS_FILE, DEFAULT_USERS, 'users');

    const adminUser = users.find((u) => u.username === 'admin');
    if (!adminUser) {
      users.unshift(SUPER_ADMIN_USER);
      writeJson(USERS_FILE, users, 'users');
    } else if (!adminUser.passwordHash || adminUser.role !== 'admin') {
      adminUser.passwordHash = SUPER_ADMIN_USER.passwordHash;
      adminUser.role = 'admin';
      writeJson(USERS_FILE, users, 'users');
    }

    return users;
  },
  getUserById: (id: string): User | undefined => {
    const users = db.getUsers();
    return users.find((u) => u.id === id);
  },
  getUserByUsername: (username: string): (User & { passwordHash?: string }) | undefined => {
    const users = db.getUsers();
    return users.find((u) => u.username === username);
  },
  saveUser: (user: User & { passwordHash?: string }): User => {
    const users = db.getUsers();
    const idx = users.findIndex((u) => u.id === user.id);
    if (idx >= 0) {
      users[idx] = { ...users[idx], ...user };
    } else {
      users.push(user);
    }
    writeJson(USERS_FILE, users, 'users');
    return user;
  },
  updateUserRole: (userId: string, role: UserRole): User | undefined => {
    const users = db.getUsers();
    const idx = users.findIndex((u) => u.id === userId);
    if (idx === -1) return undefined;
    users[idx].role = role;
    writeJson(USERS_FILE, users, 'users');
    return users[idx];
  },
  deleteUser: (userId: string): boolean => {
    const users = db.getUsers();
    const filtered = users.filter((u) => u.id !== userId);
    if (filtered.length === users.length) return false;
    writeJson(USERS_FILE, filtered, 'users');
    return true;
  },

  // Comments
  getCommentsByPostId: (postId: string): Comment[] => {
    const comments = readJson<Comment[]>(COMMENTS_FILE, [], 'comments');
    return comments
      .filter((c) => c.postId === postId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  },
  createComment: (comment: Comment): Comment => {
    const comments = readJson<Comment[]>(COMMENTS_FILE, [], 'comments');
    comments.push(comment);
    writeJson(COMMENTS_FILE, comments, 'comments');

    const post = db.getPostById(comment.postId);
    if (post) {
      db.updatePost(post.id, { commentCount: (post.commentCount || 0) + 1 });
    }
    return comment;
  },

  // Reactions
  toggleReaction: (postId: string, userId: string, type: 'like' | 'upvote' | 'downvote' | 'star', value?: number) => {
    const reactions = readJson<Reaction[]>(REACTIONS_FILE, [], 'reactions');
    const post = db.getPostById(postId);
    if (!post) return null;

    const existingIdx = reactions.findIndex((r) => r.postId === postId && r.userId === userId && r.type === type);

    if (existingIdx >= 0) {
      reactions.splice(existingIdx, 1);
      if (type === 'like') {
        post.likeCount = Math.max(0, (post.likeCount || 0) - 1);
      }
    } else {
      reactions.push({
        id: `react-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        postId,
        userId,
        type,
        value,
        createdAt: new Date().toISOString(),
      });
      if (type === 'like') {
        post.likeCount = (post.likeCount || 0) + 1;
      }
    }

    writeJson(REACTIONS_FILE, reactions, 'reactions');
    db.updatePost(postId, post);
    return post;
  },
};
