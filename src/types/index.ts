export type UserRole = 'admin' | 'teacher' | 'student' | 'guest';

export type AuthProvider = 'luyang_sso' | 'google' | 'local';

export type TeacherApplicationStatus = 'none' | 'pending' | 'rejected' | 'approved';

export interface User {
  id: string; // SSO UID, Google sub, 或自建 UUID
  provider: AuthProvider;
  username: string;
  name: string; // 中文姓名
  role: UserRole;
  email?: string;
  avatarUrl?: string;
  teacherApplicationStatus?: TeacherApplicationStatus;
  teacherApplicationReason?: string;
  teacherAppliedAt?: string;
  createdAt: string;
}

export type BoardLayoutType = 'stream' | 'shelf' | 'wall' | 'canvas' | 'timeline' | 'grid';
export type ReactionType = 'none' | 'like' | 'vote' | 'star' | 'grade';

export interface Board {
  id: string;
  title: string;
  description: string;
  coverColor: string; // 漸層或背景顏色
  layoutType: BoardLayoutType; // 第一期 MVP 為 'stream'，相容其他 5 種
  allowGuest: boolean; // 是否允許訪客免登入發文
  isPublic?: boolean; // 是否公開給未登入者瀏覽（若為 false 則僅限校內登入者瀏覽）
  requireApproval: boolean; // 是否開啟審核機制
  reactionType: ReactionType; // 回饋模式
  profanityFilter: boolean; // 不雅詞過濾器
  createdBy: string; // User ID
  creatorName: string;
  createdAt: string;
  updatedAt: string;
}

export interface Section {
  id: string;
  boardId: string;
  title: string;
  orderIndex: number;
  createdAt: string;
}

export type MediaType = 'none' | 'image' | 'audio' | 'link';

export interface MediaAttachment {
  type: MediaType;
  url: string;
  title?: string;
  metadata?: {
    duration?: number; // 錄音秒數
    width?: number;
    height?: number;
    youtubeId?: string;
  };
}

export type PostStatus = 'approved' | 'pending';

export interface Post {
  id: string;
  boardId: string;
  sectionId?: string; // 預留給 Shelf
  authorId?: string; // 訪客時為 undefined
  authorName: string; // 顯示姓名（登入者姓名或訪客自訂/匿名）
  isAuthorTeacher?: boolean;
  title: string;
  content: string;
  color: string; // 便籤背景色
  attachment?: MediaAttachment;
  status: PostStatus; // 審核狀態
  // 未來版型相容座標欄位
  orderIndex: number; // 串流與專欄的排列流水號
  posX?: number; // 畫布模式 X 座標
  posY?: number; // 畫布模式 Y 座標
  parentPostId?: string; // 關聯線或時間軸母節點
  // 互動數據匯總
  likeCount: number;
  upvotes: number;
  downvotes: number;
  starAverage: number;
  starCount: number;
  commentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  postId: string;
  authorName: string;
  authorId?: string;
  content: string;
  createdAt: string;
}

export interface Reaction {
  id: string;
  postId: string;
  userId: string; // 或訪客 ID
  type: 'like' | 'upvote' | 'downvote' | 'star' | 'grade';
  value?: number;
  createdAt: string;
}

// 鹿陽國小 SSO Token Payload 規格
export interface LuyangSSOPayload {
  uid: string;
  username: string;
  name: string;
  role: 'student' | 'teacher' | 'admin';
  iat: number;
  exp: number;
}
