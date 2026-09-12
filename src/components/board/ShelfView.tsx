'use client';

import React, { useState } from 'react';
import { Board, Post, User, Section } from '@/types';
import { PostCard } from './PostCard';
import {
  Plus,
  MoreVertical,
  Edit2,
  Trash2,
  Check,
  X,
  PlusCircle,
  FolderPlus,
  Clock,
  Filter,
} from 'lucide-react';

interface ShelfViewProps {
  board: Board;
  sections: Section[];
  posts: Post[];
  currentUser: User | null;
  isOwner: boolean;
  onOpenCreatePost: (sectionId?: string) => void;
  onPostUpdated: (post: Post) => void;
  onPostDeleted: (postId: string) => void;
  onSectionsUpdated: () => void;
}

export function ShelfView({
  board,
  sections,
  posts,
  currentUser,
  isOwner,
  onOpenCreatePost,
  onPostUpdated,
  onPostDeleted,
  onSectionsUpdated,
}: ShelfViewProps) {
  const [filterPendingOnly, setFilterPendingOnly] = useState(false);
  const [isAddingSection, setIsAddingSection] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [submittingSection, setSubmittingSection] = useState(false);

  const isTeacher = isOwner || currentUser?.role === 'teacher' || currentUser?.role === 'admin';
  const pendingCount = posts.filter((p) => p.status === 'pending').length;

  // 新增主題欄位
  const handleAddSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSectionTitle.trim()) return;

    setSubmittingSection(true);
    try {
      const res = await fetch(`/api/boards/${board.id}/sections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newSectionTitle.trim() }),
      });
      if (res.ok) {
        setNewSectionTitle('');
        setIsAddingSection(false);
        onSectionsUpdated();
      } else {
        const d = await res.json();
        alert(d.error || '新增主題失敗');
      }
    } finally {
      setSubmittingSection(false);
    }
  };

  // 編輯主題名稱
  const handleSaveEditSection = async (sectionId: string) => {
    if (!editingTitle.trim()) return;
    try {
      const res = await fetch(`/api/boards/${board.id}/sections`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectionId, title: editingTitle.trim() }),
      });
      if (res.ok) {
        setEditingSectionId(null);
        onSectionsUpdated();
      }
    } catch {
      alert('更新主題失敗');
    }
  };

  // 刪除主題欄位
  const handleDeleteSection = async (sectionId: string, title: string) => {
    if (!confirm(`確定要刪除主題分類「${title}」嗎？`)) return;
    try {
      const res = await fetch(`/api/boards/${board.id}/sections?sectionId=${sectionId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        onSectionsUpdated();
      } else {
        const d = await res.json();
        alert(d.error || '刪除失敗');
      }
    } catch {
      alert('刪除主題失敗');
    }
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
      {/* 審核提醒列（若為教師） */}
      {isTeacher && pendingCount > 0 && (
        <div className="max-w-7xl mx-auto mb-6 p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-200">
            <Clock className="w-4 h-4 text-amber-600 animate-pulse" />
            <span>目前有 {pendingCount} 則學生貼文等待您審核</span>
          </div>
          <button
            onClick={() => setFilterPendingOnly(!filterPendingOnly)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-amber-300 text-amber-900 dark:text-amber-200 text-xs font-bold shadow-xs hover:bg-amber-100 transition"
          >
            <Filter className="w-3 h-3" />
            <span>{filterPendingOnly ? '查看全部貼文' : '僅顯示待審核'}</span>
          </button>
        </div>
      )}

      {/* 橫向可滑動主題欄位容器 */}
      <div className="flex flex-row items-start gap-5 overflow-x-auto pb-8 pt-2 min-h-[calc(100vh-230px)] scrollbar-thin scrollbar-thumb-gray-300">
        {sections.map((section) => {
          // 找出屬於該主題的貼文
          const sectionPosts = posts
            .filter((p) => (p.sectionId === section.id || (!p.sectionId && section.orderIndex === 0)))
            .filter((p) => (filterPendingOnly ? p.status === 'pending' : true));

          return (
            <div
              key={section.id}
              className="w-72 sm:w-80 shrink-0 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md rounded-3xl border border-gray-200/80 dark:border-slate-800 shadow-xs flex flex-col max-h-[calc(100vh-250px)]"
            >
              {/* 欄位頭部 */}
              <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between gap-2">
                {editingSectionId === section.id ? (
                  <div className="flex items-center gap-1 flex-1">
                    <input
                      type="text"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      className="w-full text-xs font-bold bg-white text-gray-950 border border-amber-500 rounded-lg px-2 py-1 outline-hidden"
                      autoFocus
                    />
                    <button
                      onClick={() => handleSaveEditSection(section.id)}
                      className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setEditingSectionId(null)}
                      className="p-1 text-gray-400 hover:bg-gray-100 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <h3 className="font-extrabold text-sm text-gray-900 dark:text-gray-100 truncate">
                      {section.title}
                    </h3>
                    <span className="text-[11px] font-bold px-2 py-0.2 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 shrink-0">
                      {sectionPosts.length}
                    </span>
                  </div>
                )}

                {/* 教師管理選單 (重命名/刪除) */}
                {isTeacher && editingSectionId !== section.id && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => {
                        setEditingSectionId(section.id);
                        setEditingTitle(section.title);
                      }}
                      title="修改主題名稱"
                      className="p-1 text-gray-400 hover:text-amber-600 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {sections.length > 1 && (
                      <button
                        onClick={() => handleDeleteSection(section.id, section.title)}
                        title="刪除此主題"
                        className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* 欄位頂部：在此主題新增便籤快捷鍵 */}
              <div className="p-3 border-b border-gray-100/60 dark:border-slate-800/60">
                <button
                  onClick={() => onOpenCreatePost(section.id)}
                  className="w-full py-2 px-3 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 active:bg-amber-500/30 text-amber-900 dark:text-amber-300 font-bold text-xs flex items-center justify-center gap-1.5 border border-amber-300/40 transition shadow-2xs"
                >
                  <Plus className="w-4 h-4 text-amber-600" />
                  <span>在此主題貼便籤</span>
                </button>
              </div>

              {/* 該主題下的便籤卡片垂直串流 */}
              <div className="p-3 overflow-y-auto flex-1 space-y-4 scrollbar-thin">
                {sectionPosts.length === 0 ? (
                  <div className="text-center py-10 text-gray-400 dark:text-gray-500 text-xs font-medium">
                    此主題尚無便籤，<br />
                    點擊上方按鈕張貼第一張！
                  </div>
                ) : (
                  sectionPosts.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      currentUser={currentUser}
                      isOwner={isOwner}
                      onPostUpdated={onPostUpdated}
                      onPostDeleted={onPostDeleted}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}

        {/* 最右側：新增主題分類欄位（教師/管理員可見） */}
        {isTeacher ? (
          <div className="w-72 sm:w-80 shrink-0">
            {!isAddingSection ? (
              <button
                onClick={() => setIsAddingSection(true)}
                className="w-full h-32 rounded-3xl border-2 border-dashed border-gray-300 dark:border-slate-700 hover:border-amber-500 hover:bg-amber-50/50 dark:hover:bg-slate-800/50 flex flex-col items-center justify-center gap-2 text-gray-500 dark:text-gray-400 hover:text-amber-700 dark:hover:text-amber-400 font-extrabold text-xs transition group"
              >
                <div className="p-2.5 rounded-2xl bg-gray-100 dark:bg-slate-800 group-hover:bg-amber-100 dark:group-hover:bg-amber-900/50 text-gray-600 group-hover:text-amber-600 transition">
                  <FolderPlus className="w-5 h-5" />
                </div>
                <span>➕ 新增主題分類欄位</span>
              </button>
            ) : (
              <form
                onSubmit={handleAddSection}
                className="bg-white dark:bg-slate-900 rounded-3xl p-4 border-2 border-amber-500 shadow-md animate-fade-in"
              >
                <div className="text-xs font-black text-gray-900 dark:text-gray-100 mb-2">
                  新增主題欄位
                </div>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="例如：第四組・專案成果..."
                  value={newSectionTitle}
                  onChange={(e) => setNewSectionTitle(e.target.value)}
                  className="w-full text-xs font-bold bg-white text-gray-950 placeholder:text-gray-400 border-2 border-gray-300 rounded-xl px-3 py-2 outline-hidden focus:border-amber-600 mb-3 shadow-2xs"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={submittingSection || !newSectionTitle.trim()}
                    className="flex-1 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold shadow-xs transition disabled:opacity-50"
                  >
                    {submittingSection ? '建立中...' : '確認新增'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingSection(false);
                      setNewSectionTitle('');
                    }}
                    className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-bold transition"
                  >
                    取消
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
