import fs from 'fs';
import path from 'path';
import os from 'os';
import { Board, Post, Comment, Reaction, User, UserRole, Section } from '@/types';
import {
  isSupabaseConfigured,
  syncBoardToSupabase,
  deleteBoardFromSupabase,
  syncSectionToSupabase,
  deleteSectionFromSupabase,
  syncPostToSupabase,
  deletePostFromSupabase,
  syncUserToSupabase,
  deleteUserFromSupabase,
  syncCommentToSupabase,
  deleteCommentFromSupabase,
  hydrateFromSupabase,
  fetchBoardFromSupabase,
  fetchSectionsFromSupabase,
  fetchPostsFromSupabase,
} from '@/lib/supabase/adapter';

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

// ==========================================
// Supabase 狀態水合管理
// ==========================================
let hydrationPromise: Promise<void> | null = null;
let lastHydratedAt = 0;
const HYDRATION_TTL_MS = 2000; // 2 秒快取效期，避免 serverless 暖機容器保留過期記憶體資料

export async function ensureHydrated(force = false): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const now = Date.now();
  if (!force && hydrationPromise && now - lastHydratedAt < HYDRATION_TTL_MS) {
    return hydrationPromise;
  }

  hydrationPromise = (async () => {
    try {
      const data = await hydrateFromSupabase();
      if (data) {
        if (Array.isArray(data.boards)) {
          memoryStore.boards = data.boards;
          writeJson(BOARDS_FILE, data.boards, 'boards');
        }
        if (Array.isArray(data.sections)) {
          memoryStore.sections = data.sections;
          writeJson(SECTIONS_FILE, data.sections, 'sections');
        }
        if (Array.isArray(data.posts)) {
          memoryStore.posts = data.posts;
          writeJson(POSTS_FILE, data.posts, 'posts');
        }
        if (Array.isArray(data.users) && data.users.length > 0) {
          memoryStore.users = data.users;
          writeJson(USERS_FILE, data.users, 'users');
        }
        if (Array.isArray(data.comments)) {
          memoryStore.comments = data.comments;
          writeJson(COMMENTS_FILE, data.comments, 'comments');
        }
        lastHydratedAt = Date.now();
      }
    } catch (err) {
      console.error('ensureHydrated failed:', err);
    }
  })();

  await hydrationPromise;
}

// 模組載入時，若已設置 Supabase 則於背景預先水合
if (isSupabaseConfigured()) {
  ensureHydrated().catch(() => {});
}

// 系統預設資料（若無任何資料庫或檔案，初始為乾淨空陣列）
const DEFAULT_BOARDS: Board[] = [];
const DEFAULT_SECTIONS: Section[] = [];
const DEFAULT_POSTS: Post[] = [];

export const db = {
  ensureHydrated,

  // Boards
  getBoards: (): Board[] => {
    return readJson<Board[]>(BOARDS_FILE, DEFAULT_BOARDS, 'boards');
  },
  getBoardById: (id: string): Board | undefined => {
    const boards = db.getBoards();
    return boards.find((b) => b.id === id);
  },
  getBoardByIdAsync: async (id: string): Promise<Board | undefined> => {
    let board = db.getBoardById(id);
    if (!board && isSupabaseConfigured()) {
      const remote = await fetchBoardFromSupabase(id);
      if (remote) {
        const boards = db.getBoards();
        if (!boards.find((b) => b.id === remote.id)) {
          boards.unshift(remote);
          writeJson(BOARDS_FILE, boards, 'boards');
        }
        board = remote;
      }
    }
    return board;
  },
  createBoard: async (board: Board): Promise<Board> => {
    const boards = db.getBoards();
    boards.unshift(board);
    writeJson(BOARDS_FILE, boards, 'boards');
    lastHydratedAt = 0;
    if (isSupabaseConfigured()) {
      await syncBoardToSupabase(board);
    }

    // 建立新看板時，自動為其產生一個預設主題欄位
    await db.createSection({
      id: `sec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      boardId: board.id,
      title: '主題討論區 📌',
      orderIndex: 0,
      createdAt: new Date().toISOString(),
    });

    return board;
  },
  updateBoard: async (id: string, updates: Partial<Board>): Promise<Board | undefined> => {
    const boards = db.getBoards();
    const idx = boards.findIndex((b) => b.id === id);
    if (idx === -1) return undefined;
    boards[idx] = { ...boards[idx], ...updates, updatedAt: new Date().toISOString() };
    writeJson(BOARDS_FILE, boards, 'boards');
    lastHydratedAt = 0;
    if (isSupabaseConfigured()) {
      await syncBoardToSupabase(boards[idx]);
    }
    return boards[idx];
  },
  deleteBoard: async (id: string): Promise<boolean> => {
    const boards = db.getBoards();
    const filtered = boards.filter((b) => b.id !== id);
    if (filtered.length === boards.length) return false;
    writeJson(BOARDS_FILE, filtered, 'boards');
    lastHydratedAt = 0;
    if (isSupabaseConfigured()) {
      await deleteBoardFromSupabase(id);
    }
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
  getSectionsByBoardIdAsync: async (boardId: string): Promise<Section[]> => {
    let sections = db.getSectionsByBoardId(boardId);
    if (sections.length === 0 && isSupabaseConfigured()) {
      const remote = await fetchSectionsFromSupabase(boardId);
      if (remote.length > 0) {
        const allSections = readJson<Section[]>(SECTIONS_FILE, DEFAULT_SECTIONS, 'sections');
        for (const s of remote) {
          if (!allSections.find((x) => x.id === s.id)) {
            allSections.push(s);
          }
        }
        writeJson(SECTIONS_FILE, allSections, 'sections');
        sections = remote;
      }
    }
    return sections;
  },
  createSection: async (section: Section): Promise<Section> => {
    const allSections = readJson<Section[]>(SECTIONS_FILE, DEFAULT_SECTIONS, 'sections');
    allSections.push(section);
    writeJson(SECTIONS_FILE, allSections, 'sections');
    lastHydratedAt = 0;
    if (isSupabaseConfigured()) {
      await syncSectionToSupabase(section);
    }
    return section;
  },
  updateSection: async (id: string, title: string): Promise<Section | undefined> => {
    const allSections = readJson<Section[]>(SECTIONS_FILE, DEFAULT_SECTIONS, 'sections');
    const idx = allSections.findIndex((s) => s.id === id);
    if (idx === -1) return undefined;
    allSections[idx].title = title.trim();
    writeJson(SECTIONS_FILE, allSections, 'sections');
    lastHydratedAt = 0;
    if (isSupabaseConfigured()) {
      await syncSectionToSupabase(allSections[idx]);
    }
    return allSections[idx];
  },
  deleteSection: async (id: string): Promise<boolean> => {
    const allSections = readJson<Section[]>(SECTIONS_FILE, DEFAULT_SECTIONS, 'sections');
    const filtered = allSections.filter((s) => s.id !== id);
    if (filtered.length === allSections.length) return false;
    writeJson(SECTIONS_FILE, filtered, 'sections');
    lastHydratedAt = 0;
    if (isSupabaseConfigured()) {
      await deleteSectionFromSupabase(id);
    }
    return true;
  },

  // Posts
  getPostsByBoardId: (
    boardId: string,
    includePending = false,
    currentUserId?: string,
    guestPostIds: string[] = []
  ): Post[] => {
    const posts = readJson<Post[]>(POSTS_FILE, DEFAULT_POSTS, 'posts');
    return posts
      .filter((p) => {
        if (p.boardId !== boardId) return false;
        if (includePending) return true;
        if (p.status === 'approved') return true;
        // 學生可看見自己所發表、尚未審核通過的便籤
        if (Boolean(currentUserId) && p.authorId === currentUserId) return true;
        // 訪客透過暫存 ID 看見自己發表的便籤
        if (guestPostIds.includes(p.id)) return true;
        return false;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },
  getPostsByBoardIdAsync: async (
    boardId: string,
    includePending = false,
    currentUserId?: string,
    guestPostIds: string[] = []
  ): Promise<Post[]> => {
    let posts = db.getPostsByBoardId(boardId, includePending, currentUserId, guestPostIds);
    if (posts.length === 0 && isSupabaseConfigured()) {
      const remote = await fetchPostsFromSupabase(boardId);
      if (remote.length > 0) {
        const allPosts = readJson<Post[]>(POSTS_FILE, DEFAULT_POSTS, 'posts');
        for (const p of remote) {
          if (!allPosts.find((x) => x.id === p.id)) {
            allPosts.push(p);
          }
        }
        writeJson(POSTS_FILE, allPosts, 'posts');
        posts = db.getPostsByBoardId(boardId, includePending, currentUserId, guestPostIds);
      }
    }
    return posts;
  },
  getPostById: (id: string): Post | undefined => {
    const posts = readJson<Post[]>(POSTS_FILE, DEFAULT_POSTS, 'posts');
    return posts.find((p) => p.id === id);
  },
  createPost: async (post: Post): Promise<Post> => {
    const posts = readJson<Post[]>(POSTS_FILE, DEFAULT_POSTS, 'posts');
    posts.unshift(post);
    writeJson(POSTS_FILE, posts, 'posts');
    lastHydratedAt = 0;
    if (isSupabaseConfigured()) {
      await syncPostToSupabase(post);
    }
    return post;
  },
  updatePost: async (id: string, updates: Partial<Post>): Promise<Post | undefined> => {
    const posts = readJson<Post[]>(POSTS_FILE, DEFAULT_POSTS, 'posts');
    const idx = posts.findIndex((p) => p.id === id);
    if (idx === -1) return undefined;
    posts[idx] = { ...posts[idx], ...updates, updatedAt: new Date().toISOString() };
    writeJson(POSTS_FILE, posts, 'posts');
    lastHydratedAt = 0;
    if (isSupabaseConfigured()) {
      await syncPostToSupabase(posts[idx]);
    }
    return posts[idx];
  },
  deletePost: async (id: string): Promise<boolean> => {
    const posts = readJson<Post[]>(POSTS_FILE, DEFAULT_POSTS, 'posts');
    const filtered = posts.filter((p) => p.id !== id);
    if (filtered.length === posts.length) return false;
    writeJson(POSTS_FILE, filtered, 'posts');
    lastHydratedAt = 0;
    if (isSupabaseConfigured()) {
      await deletePostFromSupabase(id);
    }
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
  getUserById: (id: string): (User & { passwordHash?: string }) | undefined => {
    const users = db.getUsers();
    return users.find((u) => u.id === id);
  },
  getUserByEmail: (email: string): (User & { passwordHash?: string }) | undefined => {
    const users = db.getUsers();
    const normalized = email.toLowerCase().trim();
    return users.find((u) => u.email?.toLowerCase().trim() === normalized);
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
    if (isSupabaseConfigured()) {
      syncUserToSupabase(user).catch(console.error);
    }
    return user;
  },
  updateUserProfile: (
    userId: string,
    updates: { name?: string; passwordHash?: string }
  ): (User & { passwordHash?: string }) | undefined => {
    const users = db.getUsers();
    const idx = users.findIndex((u) => u.id === userId);
    if (idx === -1) return undefined;
    if (updates.name !== undefined) {
      users[idx].name = updates.name.trim();
    }
    if (updates.passwordHash !== undefined) {
      users[idx].passwordHash = updates.passwordHash;
    }
    writeJson(USERS_FILE, users, 'users');
    if (isSupabaseConfigured()) {
      syncUserToSupabase(users[idx]).catch(console.error);
    }
    return users[idx];
  },
  updateUserRole: (userId: string, role: UserRole): User | undefined => {
    const users = db.getUsers();
    const idx = users.findIndex((u) => u.id === userId);
    if (idx === -1) return undefined;
    users[idx].role = role;
    if (role === 'teacher') {
      users[idx].teacherApplicationStatus = 'approved';
    }
    writeJson(USERS_FILE, users, 'users');
    if (isSupabaseConfigured()) {
      syncUserToSupabase(users[idx]).catch(console.error);
    }
    return users[idx];
  },
  applyTeacherRole: (userId: string, reason?: string): User | undefined => {
    const users = db.getUsers();
    const idx = users.findIndex((u) => u.id === userId);
    if (idx === -1) return undefined;
    users[idx].teacherApplicationStatus = 'pending';
    users[idx].teacherApplicationReason = reason || '';
    users[idx].teacherAppliedAt = new Date().toISOString();
    writeJson(USERS_FILE, users, 'users');
    if (isSupabaseConfigured()) {
      syncUserToSupabase(users[idx]).catch(console.error);
    }
    return users[idx];
  },
  reviewTeacherApplication: (userId: string, action: 'approve' | 'reject'): User | undefined => {
    const users = db.getUsers();
    const idx = users.findIndex((u) => u.id === userId);
    if (idx === -1) return undefined;
    if (action === 'approve') {
      users[idx].role = 'teacher';
      users[idx].teacherApplicationStatus = 'approved';
    } else {
      users[idx].role = 'student';
      users[idx].teacherApplicationStatus = 'rejected';
    }
    writeJson(USERS_FILE, users, 'users');
    if (isSupabaseConfigured()) {
      syncUserToSupabase(users[idx]).catch(console.error);
    }
    return users[idx];
  },
  deleteUser: (userId: string): boolean => {
    const users = db.getUsers();
    const filtered = users.filter((u) => u.id !== userId);
    if (filtered.length === users.length) return false;
    writeJson(USERS_FILE, filtered, 'users');
    if (isSupabaseConfigured()) {
      deleteUserFromSupabase(userId).catch(console.error);
    }
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
    if (isSupabaseConfigured()) {
      syncCommentToSupabase(comment).catch(console.error);
    }

    const post = db.getPostById(comment.postId);
    if (post) {
      db.updatePost(post.id, { commentCount: (post.commentCount || 0) + 1 });
    }
    return comment;
  },
  getCommentById: (id: string): Comment | undefined => {
    const comments = readJson<Comment[]>(COMMENTS_FILE, [], 'comments');
    return comments.find((c) => c.id === id);
  },
  deleteComment: async (id: string): Promise<boolean> => {
    const comments = readJson<Comment[]>(COMMENTS_FILE, [], 'comments');
    const target = comments.find((c) => c.id === id);
    if (!target) return false;

    const filtered = comments.filter((c) => c.id !== id);
    writeJson(COMMENTS_FILE, filtered, 'comments');
    if (isSupabaseConfigured()) {
      await deleteCommentFromSupabase(id);
    }

    const post = db.getPostById(target.postId);
    if (post) {
      db.updatePost(post.id, { commentCount: Math.max(0, (post.commentCount || 0) - 1) });
    }
    return true;
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
