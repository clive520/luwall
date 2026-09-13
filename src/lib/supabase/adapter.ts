import { getSupabase, isSupabaseConfigured } from './client';
export { isSupabaseConfigured } from './client';
import { Board, Section, Post, User, Comment } from '@/types';

// ==========================================
// 轉換器：CamelCase ⟷ Snake_Case
// ==========================================
export function boardToRow(b: Board) {
  return {
    id: b.id,
    title: b.title,
    description: b.description || '',
    cover_color: b.coverColor,
    layout_type: b.layoutType || 'shelf',
    allow_guest: b.allowGuest !== false,
    is_public: b.isPublic !== false,
    require_approval: Boolean(b.requireApproval),
    reaction_type: b.reactionType || 'like',
    profanity_filter: b.profanityFilter !== false,
    created_by: b.createdBy,
    creator_name: b.creatorName,
    created_at: b.createdAt,
    updated_at: b.updatedAt,
  };
}

export function rowToBoard(r: any): Board {
  return {
    id: r.id,
    title: r.title,
    description: r.description || '',
    coverColor: r.cover_color,
    layoutType: r.layout_type,
    allowGuest: r.allow_guest,
    isPublic: r.is_public,
    requireApproval: r.require_approval,
    reactionType: r.reaction_type,
    profanityFilter: r.profanity_filter,
    createdBy: r.created_by,
    creatorName: r.creator_name,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function sectionToRow(s: Section) {
  return {
    id: s.id,
    board_id: s.boardId,
    title: s.title,
    order_index: s.orderIndex,
    created_at: s.createdAt,
  };
}

export function rowToSection(r: any): Section {
  return {
    id: r.id,
    boardId: r.board_id,
    title: r.title,
    orderIndex: r.order_index,
    createdAt: r.created_at,
  };
}

export function postToRow(p: Post) {
  return {
    id: p.id,
    board_id: p.boardId,
    section_id: p.sectionId || null,
    author_id: p.authorId || null,
    author_name: p.authorName,
    is_author_teacher: Boolean(p.isAuthorTeacher),
    title: p.title,
    content: p.content,
    color: p.color,
    attachment: p.attachment || null,
    status: p.status,
    order_index: p.orderIndex || 0,
    pos_x: p.posX || null,
    pos_y: p.posY || null,
    like_count: p.likeCount || 0,
    upvotes: p.upvotes || 0,
    downvotes: p.downvotes || 0,
    star_average: p.starAverage || 0,
    star_count: p.starCount || 0,
    comment_count: p.commentCount || 0,
    created_at: p.createdAt,
    updated_at: p.updatedAt,
  };
}

export function rowToPost(r: any): Post {
  return {
    id: r.id,
    boardId: r.board_id,
    sectionId: r.section_id || undefined,
    authorId: r.author_id || undefined,
    authorName: r.author_name,
    isAuthorTeacher: r.is_author_teacher,
    title: r.title,
    content: r.content,
    color: r.color,
    attachment: r.attachment || undefined,
    status: r.status,
    orderIndex: r.order_index,
    posX: r.pos_x,
    posY: r.pos_y,
    likeCount: r.like_count || 0,
    upvotes: r.upvotes || 0,
    downvotes: r.downvotes || 0,
    starAverage: r.star_average || 0,
    starCount: r.star_count || 0,
    commentCount: r.comment_count || 0,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function userToRow(u: User & { passwordHash?: string }) {
  return {
    id: u.id,
    provider: u.provider,
    username: u.username,
    name: u.name,
    role: u.role,
    email: u.email || null,
    avatar_url: u.avatarUrl || null,
    password_hash: u.passwordHash || null,
    teacher_application_status: u.teacherApplicationStatus || 'none',
    teacher_application_reason: u.teacherApplicationReason || null,
    teacher_applied_at: u.teacherAppliedAt || null,
    created_at: u.createdAt,
  };
}

export function rowToUser(r: any): User & { passwordHash?: string } {
  return {
    id: r.id,
    provider: r.provider,
    username: r.username,
    name: r.name,
    role: r.role,
    email: r.email,
    avatarUrl: r.avatar_url,
    passwordHash: r.password_hash,
    teacherApplicationStatus: r.teacher_application_status || 'none',
    teacherApplicationReason: r.teacher_application_reason,
    teacherAppliedAt: r.teacher_applied_at,
    createdAt: r.created_at,
  };
}

export function commentToRow(c: Comment) {
  return {
    id: c.id,
    post_id: c.postId,
    author_name: c.authorName,
    author_id: c.authorId || null,
    content: c.content,
    created_at: c.createdAt,
  };
}

export function rowToComment(r: any): Comment {
  return {
    id: r.id,
    postId: r.post_id,
    authorName: r.author_name,
    authorId: r.author_id,
    content: r.content,
    createdAt: r.created_at,
  };
}

// ==========================================
// 非同步資料庫同步操作 (安全防護：失敗不阻斷主線程)
// ==========================================
export async function syncBoardToSupabase(board: Board) {
  const supabase = getSupabase();
  if (!supabase) return;
  try {
    await supabase.from('boards').upsert(boardToRow(board));
  } catch (err) {
    console.error('Failed to sync board to Supabase:', err);
  }
}

export async function deleteBoardFromSupabase(id: string) {
  const supabase = getSupabase();
  if (!supabase) return;
  try {
    await supabase.from('boards').delete().eq('id', id);
  } catch (err) {
    console.error('Failed to delete board from Supabase:', err);
  }
}

export async function syncSectionToSupabase(section: Section) {
  const supabase = getSupabase();
  if (!supabase) return;
  try {
    await supabase.from('sections').upsert(sectionToRow(section));
  } catch (err) {
    console.error('Failed to sync section to Supabase:', err);
  }
}

export async function deleteSectionFromSupabase(id: string) {
  const supabase = getSupabase();
  if (!supabase) return;
  try {
    await supabase.from('sections').delete().eq('id', id);
  } catch (err) {
    console.error('Failed to delete section from Supabase:', err);
  }
}

export async function syncPostToSupabase(post: Post) {
  const supabase = getSupabase();
  if (!supabase) return;
  try {
    await supabase.from('posts').upsert(postToRow(post));
  } catch (err) {
    console.error('Failed to sync post to Supabase:', err);
  }
}

export async function deletePostFromSupabase(id: string) {
  const supabase = getSupabase();
  if (!supabase) return;
  try {
    await supabase.from('posts').delete().eq('id', id);
  } catch (err) {
    console.error('Failed to delete post from Supabase:', err);
  }
}

export async function syncUserToSupabase(user: User & { passwordHash?: string }) {
  const supabase = getSupabase();
  if (!supabase) return;
  try {
    await supabase.from('users').upsert(userToRow(user));
  } catch (err) {
    console.error('Failed to sync user to Supabase:', err);
  }
}

export async function deleteUserFromSupabase(id: string) {
  const supabase = getSupabase();
  if (!supabase) return;
  try {
    await supabase.from('users').delete().eq('id', id);
  } catch (err) {
    console.error('Failed to delete user from Supabase:', err);
  }
}

export async function syncCommentToSupabase(comment: Comment) {
  const supabase = getSupabase();
  if (!supabase) return;
  try {
    await supabase.from('comments').upsert(commentToRow(comment));
  } catch (err) {
    console.error('Failed to sync comment to Supabase:', err);
  }
}

export async function deleteCommentFromSupabase(id: string) {
  const supabase = getSupabase();
  if (!supabase) return;
  try {
    await supabase.from('comments').delete().eq('id', id);
  } catch (err) {
    console.error('Failed to delete comment from Supabase:', err);
  }
}

// ==========================================
// 啟動時自 Supabase 水合 (Hydrate) 載入全部資料
// ==========================================
export async function hydrateFromSupabase(): Promise<{
  boards: Board[];
  sections: Section[];
  posts: Post[];
  users: (User & { passwordHash?: string })[];
  comments: Comment[];
} | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  try {
    const [bRes, sRes, pRes, uRes, cRes] = await Promise.all([
      supabase.from('boards').select('*').order('created_at', { ascending: false }),
      supabase.from('sections').select('*').order('order_index', { ascending: true }),
      supabase.from('posts').select('*').order('created_at', { ascending: false }),
      supabase.from('users').select('*'),
      supabase.from('comments').select('*').order('created_at', { ascending: true }),
    ]);

    return {
      boards: (bRes.data || []).map(rowToBoard),
      sections: (sRes.data || []).map(rowToSection),
      posts: (pRes.data || []).map(rowToPost),
      users: (uRes.data || []).map(rowToUser),
      comments: (cRes.data || []).map(rowToComment),
    };
  } catch (err) {
    console.error('Hydration from Supabase failed, falling back to local files:', err);
    return null;
  }
}

// 直連 Supabase 查詢特定看板（防止 Serverless 記憶體未即時同步而回傳 404）
export async function fetchBoardFromSupabase(id: string): Promise<Board | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from('boards').select('*').eq('id', id).maybeSingle();
    if (error || !data) return null;
    return rowToBoard(data);
  } catch (err) {
    console.error('fetchBoardFromSupabase error:', err);
    return null;
  }
}

// 直連 Supabase 查詢看板主題分欄
export async function fetchSectionsFromSupabase(boardId: string): Promise<Section[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('sections')
      .select('*')
      .eq('board_id', boardId)
      .order('order_index', { ascending: true });
    if (error || !data) return [];
    return data.map(rowToSection);
  } catch (err) {
    console.error('fetchSectionsFromSupabase error:', err);
    return [];
  }
}

// 直連 Supabase 查詢看板便籤貼文
export async function fetchPostsFromSupabase(boardId: string): Promise<Post[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('board_id', boardId)
      .order('created_at', { ascending: false });
    if (error || !data) return [];
    return data.map(rowToPost);
  } catch (err) {
    console.error('fetchPostsFromSupabase error:', err);
    return [];
  }
}
