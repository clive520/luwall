'use client';

import React, { useState, useMemo } from 'react';
import { Board, Post, User, Section, MediaAttachment } from '@/types';
import { PostCard } from './PostCard';
import {
  Plus,
  Clock,
  Filter,
  Layers,
  Folder,
  UploadCloud,
  Loader2,
  Sparkles,
} from 'lucide-react';

interface WallViewProps {
  board: Board;
  sections: Section[];
  posts: Post[];
  currentUser: User | null;
  isOwner: boolean;
  onPostClick?: (post: Post) => void;
  onOpenCreatePost: (sectionId?: string, initialAttachment?: MediaAttachment) => void;
  onPostUpdated: (post: Post) => void;
  onPostDeleted: (postId: string) => void;
  onSectionsUpdated: () => void;
}

export function WallView({
  board: _board,
  sections,
  posts,
  currentUser,
  isOwner,
  onPostClick,
  onOpenCreatePost,
  onPostUpdated,
  onPostDeleted,
}: WallViewProps) {
  const [selectedSectionId, setSelectedSectionId] = useState<string | 'all'>('all');
  const [filterPendingOnly, setFilterPendingOnly] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // 身分與權限判斷（嚴格限定開板老師或管理員）
  const isOwnerOrAdmin = isOwner || currentUser?.role === 'admin';
  const pendingCount = posts.filter((p) => p.status === 'pending').length;

  // 拖曳照片至牆面任意處自動上傳發文
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!file.type.startsWith('image/')) {
      alert('請拖曳圖片檔案（支援 JPG、PNG、WebP、GIF 等）');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('圖片大小不能超過 5MB');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'image');

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '圖片上傳失敗');
      }

      const attachment: MediaAttachment = {
        type: 'image',
        url: data.url,
        title: file.name,
      };

      // 若目前有選取特定主題，將便籤預設貼到該主題，否則預設第一個主題
      const defaultSection =
        selectedSectionId !== 'all'
          ? selectedSectionId
          : sections[0]?.id;

      onOpenCreatePost(defaultSection, attachment);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '上傳失敗';
      alert(msg);
    } finally {
      setIsUploading(false);
    }
  };

  // 依據選取的主題分類與審核狀態進行過濾
  const displayedPosts = useMemo(() => {
    return posts.filter((post) => {
      // 1. 審核狀態過濾
      if (filterPendingOnly && post.status !== 'pending') {
        return false;
      }

      // 2. 主題過濾
      if (selectedSectionId === 'all') {
        return true;
      }
      return (
        post.sectionId === selectedSectionId ||
        (!post.sectionId && sections[0]?.id === selectedSectionId)
      );
    });
  }, [posts, selectedSectionId, filterPendingOnly, sections]);

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`w-full min-h-[70vh] px-4 sm:px-6 lg:px-10 py-6 transition-all relative ${
        isDraggingOver ? 'bg-amber-100/40 ring-4 ring-amber-400 ring-inset rounded-3xl' : ''
      }`}
    >
      {/* 拖曳上傳提示覆蓋層 */}
      {isDraggingOver && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-amber-500/10 backdrop-blur-xs rounded-3xl pointer-events-none">
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border-2 border-amber-400 flex flex-col items-center gap-3 animate-bounce">
            <UploadCloud className="w-12 h-12 text-amber-600" />
            <span className="text-base font-black text-gray-800 dark:text-gray-100">
              放開滑鼠即可張貼照片到鹿鳴牆！📸
            </span>
          </div>
        </div>
      )}

      {/* 上傳中浮動提示 */}
      {isUploading && (
        <div className="fixed bottom-8 right-8 z-50 px-5 py-3 rounded-2xl bg-gray-900 text-white shadow-2xl flex items-center gap-3 animate-fade-in">
          <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
          <span className="text-xs font-bold">正在上傳圖片並準備便籤...</span>
        </div>
      )}

      {/* 頂部工具列：主題分類切換膠囊列與審核提醒 */}
      <div className="max-w-7xl mx-auto space-y-4 mb-8">
        {/* 開板老師審核提醒列 */}
        {isOwnerOrAdmin && pendingCount > 0 && (
          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2.5 text-xs font-bold text-amber-900 dark:text-amber-200">
              <Clock className="w-4 h-4 text-amber-600 animate-pulse" />
              <span>目前有 {pendingCount} 則學生貼文等待您審核</span>
            </div>
            <button
              onClick={() => setFilterPendingOnly(!filterPendingOnly)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-amber-300 text-amber-900 dark:text-amber-200 text-xs font-bold shadow-xs hover:bg-amber-100 dark:hover:bg-amber-900/30 transition"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>{filterPendingOnly ? '查看全部貼文' : '僅顯示待審核'}</span>
            </button>
          </div>
        )}

        {/* 學生/非板主視角：若有待審核便籤的提醒 */}
        {!isOwnerOrAdmin && pendingCount > 0 && (
          <div className="p-3.5 rounded-2xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 flex items-center gap-2.5 text-xs font-bold text-amber-900 dark:text-amber-200 shadow-xs">
            <Clock className="w-4 h-4 text-amber-600 animate-spin shrink-0" />
            <span>您有 {pendingCount} 則發布的便籤正在「等待老師同意中」，審核通過後即會公開展示！</span>
          </div>
        )}

        {/* 主題分類切換膠囊（Filter Pills）與發文觸發鈕 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-black/5 dark:border-white/5">
          {/* 橫向可滾動的主題膠囊標籤 */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {/* 全部標籤 */}
            <button
              onClick={() => setSelectedSectionId('all')}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-black transition whitespace-nowrap shadow-2xs ${
                selectedSectionId === 'all'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'bg-white/90 dark:bg-slate-800/90 text-gray-700 dark:text-gray-300 hover:bg-amber-50 dark:hover:bg-slate-700 border border-black/5 dark:border-white/5'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>全部便籤</span>
              <span
                className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  selectedSectionId === 'all'
                    ? 'bg-white/30 text-white'
                    : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300'
                }`}
              >
                {posts.length}
              </span>
            </button>

            {/* 各主題分類標籤 */}
            {sections.map((sec) => {
              const secPostCount = posts.filter(
                (p) => p.sectionId === sec.id || (!p.sectionId && sec.orderIndex === 0)
              ).length;
              const isSelected = selectedSectionId === sec.id;

              return (
                <button
                  key={sec.id}
                  onClick={() => setSelectedSectionId(sec.id)}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-black transition whitespace-nowrap shadow-2xs ${
                    isSelected
                      ? 'bg-amber-600 text-white shadow-md'
                      : 'bg-white/90 dark:bg-slate-800/90 text-gray-700 dark:text-gray-300 hover:bg-amber-50 dark:hover:bg-slate-700 border border-black/5 dark:border-white/5'
                  }`}
                >
                  <Folder className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-amber-600'}`} />
                  <span>{sec.title}</span>
                  <span
                    className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      isSelected
                        ? 'bg-white/30 text-white'
                        : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300'
                    }`}
                  >
                    {secPostCount}
                  </span>
                </button>
              );
            })}
          </div>

          {/* 快速貼便籤按鈕 */}
          <div className="shrink-0 flex items-center gap-2">
            <button
              onClick={() =>
                onOpenCreatePost(
                  selectedSectionId !== 'all' ? selectedSectionId : undefined
                )
              }
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2 rounded-2xl bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-xs font-black shadow-md transition"
            >
              <Plus className="w-4 h-4" />
              <span>
                {selectedSectionId !== 'all'
                  ? `貼便籤至「${sections.find((s) => s.id === selectedSectionId)?.title || '主題'}」`
                  : '張貼新便籤 📝'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* 瀑布流磚牆主體（Masonry Grid） */}
      {displayedPosts.length === 0 ? (
        <div className="max-w-md mx-auto my-16 p-8 text-center bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-3xl border border-dashed border-gray-300 dark:border-slate-700 shadow-sm">
          <div className="w-16 h-16 mx-auto mb-4 rounded-3xl bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 flex items-center justify-center text-3xl">
            🦌
          </div>
          <h3 className="text-base font-black text-gray-800 dark:text-gray-100 mb-1">
            {filterPendingOnly ? '目前沒有待審核的便籤' : '這面鹿鳴牆上還靜悄悄的'}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
            {filterPendingOnly
              ? '所有學生發布的內容皆已審核完畢！'
              : '點擊下方按鈕或直接把照片拖曳到此處，張貼全班第一張精彩便籤！'}
          </p>
          {!filterPendingOnly && (
            <button
              onClick={() =>
                onOpenCreatePost(
                  selectedSectionId !== 'all' ? selectedSectionId : undefined
                )
              }
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black shadow-md transition transform active:scale-95"
            >
              <Sparkles className="w-4 h-4" />
              <span>立即張貼第一張便籤</span>
            </button>
          )}
        </div>
      ) : (
        <div className="max-w-[1920px] mx-auto">
          {/* CSS Multi-column 瀑布流核心排版 */}
          <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 2xl:columns-6 gap-5 [column-fill:_balance]">
            {displayedPosts.map((post) => (
              <div
                key={post.id}
                className="break-inside-avoid mb-5 transform-gpu transition-all duration-200"
              >
                <PostCard
                  post={post}
                  sections={sections}
                  currentUser={currentUser}
                  isOwner={isOwner}
                  onPostClick={onPostClick}
                  onPostUpdated={onPostUpdated}
                  onPostDeleted={onPostDeleted}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
