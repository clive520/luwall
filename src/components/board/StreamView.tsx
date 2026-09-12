'use client';

import React, { useState } from 'react';
import { Board, Post, User } from '@/types';
import { PostCard } from './PostCard';
import { Plus, Sparkles, Filter, Clock } from 'lucide-react';

interface StreamViewProps {
  board: Board;
  posts: Post[];
  currentUser: User | null;
  isOwner: boolean;
  onOpenCreatePost: () => void;
  onPostUpdated: (post: Post) => void;
  onPostDeleted: (postId: string) => void;
}

export function StreamView({
  board: _board,
  posts,
  currentUser,
  isOwner,
  onOpenCreatePost,
  onPostUpdated,
  onPostDeleted,
}: StreamViewProps) {
  const [filterPendingOnly, setFilterPendingOnly] = useState(false);

  const isTeacher = isOwner || currentUser?.role === 'teacher' || currentUser?.role === 'admin';

  const pendingCount = posts.filter((p) => p.status === 'pending').length;
  const displayedPosts = filterPendingOnly
    ? posts.filter((p) => p.status === 'pending')
    : posts;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* 快速發文觸發列 */}
      <div
        onClick={onOpenCreatePost}
        className="cursor-pointer bg-white/95 hover:bg-white rounded-3xl p-4 shadow-sm hover:shadow-md border border-amber-200 transition-all duration-200 flex items-center justify-between gap-4 mb-8 group"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-100 group-hover:bg-amber-500 text-amber-800 group-hover:text-white flex items-center justify-center transition-colors">
            <Plus className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-gray-800 group-hover:text-amber-800 transition-colors">
              在這裡寫下你的想法或提問...
            </div>
            <div className="text-xs text-gray-400">
              支援文字、照片、3分鐘語音與 YouTube 影片
            </div>
          </div>
        </div>

        <button
          type="button"
          className="px-4 py-2 rounded-xl bg-amber-600 group-hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition"
        >
          發表便籤
        </button>
      </div>

      {/* 課堂審核過濾列（若是教師且有待審核貼文） */}
      {isTeacher && pendingCount > 0 && (
        <div className="mb-6 p-3 rounded-2xl bg-amber-50 border border-amber-300 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
            <Clock className="w-4 h-4 text-amber-600 animate-pulse" />
            <span>目前有 {pendingCount} 則學生貼文等待您審核</span>
          </div>
          <button
            onClick={() => setFilterPendingOnly(!filterPendingOnly)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-amber-300 text-amber-900 text-xs font-bold shadow-xs hover:bg-amber-100 transition"
          >
            <Filter className="w-3 h-3" />
            <span>{filterPendingOnly ? '查看全部貼文' : '僅顯示待審核'}</span>
          </button>
        </div>
      )}

      {/* 貼文串流列表 */}
      {displayedPosts.length === 0 ? (
        <div className="text-center py-16 bg-white/60 rounded-3xl border border-dashed border-gray-300">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center text-2xl">
            🦌
          </div>
          <h4 className="text-base font-bold text-gray-800 mb-1">
            {filterPendingOnly ? '目前沒有待審核貼文' : '鹿鳴牆上還靜悄悄的'}
          </h4>
          <p className="text-xs text-gray-500 mb-4">
            點擊上方按鈕，成為第一個在看板上貼便籤的人吧！
          </p>
          <button
            onClick={onOpenCreatePost}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>立即發表</span>
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {displayedPosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUser={currentUser}
              isOwner={isOwner}
              onPostUpdated={onPostUpdated}
              onPostDeleted={onPostDeleted}
            />
          ))}
        </div>
      )}
    </div>
  );
}
