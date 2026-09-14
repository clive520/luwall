'use client';

import React, { useState } from 'react';
import { Board, Post, User, Section, MediaAttachment } from '@/types';
import { PostCard } from './PostCard';
import {
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  FolderPlus,
  Clock,
  Filter,
  UploadCloud,
  Loader2,
  GripVertical,
} from 'lucide-react';

interface ShelfViewProps {
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
  onPostsReordered?: (posts: Post[]) => void;
  onSectionsReordered?: (sections: Section[]) => void;
}

export function ShelfView({
  board,
  sections,
  posts,
  currentUser,
  isOwner,
  onPostClick,
  onOpenCreatePost,
  onPostUpdated,
  onPostDeleted,
  onSectionsUpdated,
  onPostsReordered,
  onSectionsReordered,
}: ShelfViewProps) {
  const [filterPendingOnly, setFilterPendingOnly] = useState(false);
  const [isAddingSection, setIsAddingSection] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [submittingSection, setSubmittingSection] = useState(false);

  // 檔案上傳狀態
  const [dragOverSectionId, setDragOverSectionId] = useState<string | null>(null);
  const [uploadingSectionId, setUploadingSectionId] = useState<string | null>(null);

  // 主題分類（左右拖曳）狀態
  const [draggingSectionId, setDraggingSectionId] = useState<string | null>(null);
  const [sectionDropTarget, setSectionDropTarget] = useState<{
    sectionId: string;
    position: 'before' | 'after';
  } | null>(null);

  // 便籤卡片（上下拖曳）狀態
  const [draggingPostId, setDraggingPostId] = useState<string | null>(null);
  const [postDropTarget, setPostDropTarget] = useState<{
    sectionId: string;
    postId?: string;
    position: 'before' | 'after' | 'empty';
  } | null>(null);

  const isOwnerOrAdmin = isOwner || currentUser?.role === 'admin';
  const pendingCount = posts.filter((p) => p.status === 'pending').length;

  // 依 orderIndex 升冪排列主題分類
  const sortedSections = [...sections].sort(
    (a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0)
  );

  // 取得某主題下的排序便籤
  const getSectionPosts = (sectionId: string, orderIndex: number) => {
    return posts
      .filter((p) => p.sectionId === sectionId || (!p.sectionId && orderIndex === 0))
      .filter((p) => (filterPendingOnly ? p.status === 'pending' : true))
      .sort((a, b) => {
        if (a.orderIndex !== undefined && b.orderIndex !== undefined && a.orderIndex !== b.orderIndex) {
          return a.orderIndex - b.orderIndex;
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  };

  // ==========================================
  // 1. 拖曳照片檔案上傳發文
  // ==========================================
  const handleDropFilesOnSection = async (sectionId: string, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverSectionId(null);

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (file.type.toLowerCase().startsWith('video/')) {
      alert('為保障系統效能，不支援影片直接上傳，請貼入 YouTube 連結！');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      alert('檔案大小不能超過 20MB');
      return;
    }

    const isImage = file.type.startsWith('image/');

    setUploadingSectionId(sectionId);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', isImage ? 'image' : 'file');

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '檔案上傳失敗');
      }

      const attachment: MediaAttachment = isImage
        ? {
            type: 'image',
            url: data.url,
            title: file.name,
          }
        : {
            type: 'file',
            url: data.url,
            title: file.name,
            metadata: {
              fileName: data.fileName || file.name,
              fileSize: data.size || file.size,
              fileExtension: data.fileExtension || file.name.split('.').pop() || '',
              mimeType: data.mimeType || file.type,
            },
          };

      onOpenCreatePost(sectionId, attachment);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '上傳失敗';
      alert(msg);
    } finally {
      setUploadingSectionId(null);
    }
  };

  // ==========================================
  // 2. 主題分類（左右拖曳）處理函式
  // ==========================================
  const handleSectionDragStart = (e: React.DragEvent, sectionId: string) => {
    if (!isOwnerOrAdmin) return;
    e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'section', sectionId }));
    e.dataTransfer.effectAllowed = 'move';
    setDraggingSectionId(sectionId);
  };

  const handleSectionDragOver = (e: React.DragEvent, targetSectionId: string) => {
    if (!draggingSectionId || draggingSectionId === targetSectionId) return;
    e.preventDefault();
    e.stopPropagation();

    const rect = e.currentTarget.getBoundingClientRect();
    const isAfter = e.clientX > rect.left + rect.width / 2;
    setSectionDropTarget({
      sectionId: targetSectionId,
      position: isAfter ? 'after' : 'before',
    });
  };

  const handleSectionDrop = (e: React.DragEvent, targetSectionId: string) => {
    if (!draggingSectionId) return;
    e.preventDefault();
    e.stopPropagation();

    if (draggingSectionId === targetSectionId) {
      handleDragEnd();
      return;
    }

    const currentIdx = sortedSections.findIndex((s) => s.id === draggingSectionId);
    const targetIdx = sortedSections.findIndex((s) => s.id === targetSectionId);

    if (currentIdx !== -1 && targetIdx !== -1) {
      const newSections = [...sortedSections];
      const [moved] = newSections.splice(currentIdx, 1);
      let insertIdx = newSections.findIndex((s) => s.id === targetSectionId);
      if (sectionDropTarget?.position === 'after') {
        insertIdx += 1;
      }
      newSections.splice(insertIdx, 0, moved);
      const reordered = newSections.map((s, idx) => ({ ...s, orderIndex: idx }));

      if (onSectionsReordered) {
        onSectionsReordered(reordered);
      }

      fetch(`/api/boards/${board.id}/sections`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds: reordered.map((s) => s.id) }),
      }).catch(console.error);
    }

    handleDragEnd();
  };

  // ==========================================
  // 3. 便籤卡片（上下拖曳與跨欄移動）處理函式
  // ==========================================
  const handlePostDragStart = (e: React.DragEvent, postId: string, sectionId: string) => {
    e.stopPropagation();
    e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'post', postId, sectionId }));
    e.dataTransfer.effectAllowed = 'move';
    setDraggingPostId(postId);
  };

  const handlePostDragOver = (e: React.DragEvent, targetPostId: string, sectionId: string) => {
    if (!draggingPostId || draggingPostId === targetPostId) return;
    e.preventDefault();
    e.stopPropagation();

    const rect = e.currentTarget.getBoundingClientRect();
    const isAfter = e.clientY > rect.top + rect.height / 2;
    setPostDropTarget({
      sectionId,
      postId: targetPostId,
      position: isAfter ? 'after' : 'before',
    });
  };

  const handleSectionContainerDragOver = (e: React.DragEvent, sectionId: string) => {
    if (!draggingPostId) return;
    e.preventDefault();
    e.stopPropagation();

    if (!postDropTarget || postDropTarget.sectionId !== sectionId || !postDropTarget.postId) {
      setPostDropTarget({
        sectionId,
        position: 'empty',
      });
    }
  };

  const handlePostDrop = (e: React.DragEvent, targetSectionId: string, targetPostId?: string) => {
    if (!draggingPostId) return;
    e.preventDefault();
    e.stopPropagation();

    const postToMove = posts.find((p) => p.id === draggingPostId);
    if (!postToMove) {
      handleDragEnd();
      return;
    }

    // 取得目標欄位的所有貼文（除了被拖曳者本身）
    const currentTargetPosts = posts
      .filter(
        (p) =>
          p.id !== draggingPostId &&
          (p.sectionId === targetSectionId || (!p.sectionId && sortedSections[0]?.id === targetSectionId))
      )
      .sort((a, b) => {
        if (a.orderIndex !== undefined && b.orderIndex !== undefined && a.orderIndex !== b.orderIndex) {
          return a.orderIndex - b.orderIndex;
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

    let insertIndex = currentTargetPosts.length; // 預設放末端
    if (targetPostId) {
      const idx = currentTargetPosts.findIndex((p) => p.id === targetPostId);
      if (idx !== -1) {
        insertIndex = postDropTarget?.position === 'after' ? idx + 1 : idx;
      }
    }

    const updatedTargetPosts = [...currentTargetPosts];
    const updatedPostToMove = {
      ...postToMove,
      sectionId: targetSectionId,
    };
    updatedTargetPosts.splice(insertIndex, 0, updatedPostToMove);

    const reorderedInTarget = updatedTargetPosts.map((p, idx) => ({
      ...p,
      orderIndex: idx,
    }));

    // 保留非目標欄位的其他貼文
    const otherPosts = posts.filter(
      (p) =>
        p.id !== draggingPostId &&
        p.sectionId !== targetSectionId &&
        (p.sectionId || sortedSections[0]?.id !== targetSectionId)
    );

    const finalAllPosts = [...otherPosts, ...reorderedInTarget];

    if (onPostsReordered) {
      onPostsReordered(finalAllPosts);
    }

    fetch(`/api/boards/${board.id}/posts/reorder`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reorderedPosts: reorderedInTarget.map((p) => ({
          id: p.id,
          orderIndex: p.orderIndex,
          sectionId: p.sectionId,
        })),
      }),
    }).catch(console.error);

    handleDragEnd();
  };

  const handleDragEnd = () => {
    setDraggingSectionId(null);
    setSectionDropTarget(null);
    setDraggingPostId(null);
    setPostDropTarget(null);
    setDragOverSectionId(null);
  };

  // ==========================================
  // 4. 主題 CRUD 操作
  // ==========================================
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
      {/* 審核提醒列（若為看板擁有者或管理員） */}
      {isOwnerOrAdmin && pendingCount > 0 && (
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

      {/* 學生/非板主視角：若有待審核的便籤，提示正在等待老師同意 */}
      {!isOwnerOrAdmin && pendingCount > 0 && (
        <div className="max-w-7xl mx-auto mb-6 p-3.5 rounded-2xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 flex items-center gap-2.5 text-xs font-bold text-amber-900 dark:text-amber-200 shadow-xs">
          <Clock className="w-4 h-4 text-amber-600 animate-spin shrink-0" />
          <span>您有 {pendingCount} 則發布的便籤正在「等待老師同意中」，審核通過後即會公開展示！</span>
        </div>
      )}

      {/* 橫向可滑動主題欄位容器 */}
      <div className="flex flex-row items-start gap-6 overflow-x-auto pb-16 pt-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700">
        {sortedSections.map((section) => {
          const sectionPosts = getSectionPosts(section.id, section.orderIndex);

          const isColumnDragging = dragOverSectionId === section.id;
          const isColumnUploading = uploadingSectionId === section.id;

          const isThisSectionDragging = draggingSectionId === section.id;
          const isTargetBefore =
            sectionDropTarget?.sectionId === section.id && sectionDropTarget?.position === 'before';
          const isTargetAfter =
            sectionDropTarget?.sectionId === section.id && sectionDropTarget?.position === 'after';

          return (
            <div
              key={section.id}
              onDragOver={(e) => {
                if (e.dataTransfer.types.includes('Files')) {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragOverSectionId(section.id);
                } else if (draggingSectionId) {
                  handleSectionDragOver(e, section.id);
                }
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                setDragOverSectionId(null);
                if (sectionDropTarget?.sectionId === section.id) {
                  setSectionDropTarget(null);
                }
              }}
              onDrop={(e) => {
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  handleDropFilesOnSection(section.id, e);
                } else if (draggingSectionId) {
                  handleSectionDrop(e, section.id);
                } else if (draggingPostId) {
                  handlePostDrop(e, section.id);
                }
              }}
              className={`w-76 sm:w-84 shrink-0 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md rounded-3xl border shadow-xs flex flex-col transition-all relative overflow-visible ${
                isColumnDragging
                  ? 'border-amber-500 ring-4 ring-amber-300/60 scale-[1.01]'
                  : isThisSectionDragging
                  ? 'opacity-40 border-dashed border-amber-400 scale-[0.98]'
                  : 'border-gray-200/90 dark:border-slate-800 hover:border-amber-200 dark:hover:border-slate-700'
              }`}
            >
              {/* 主題左右拖曳放置引導線（左側） */}
              {isTargetBefore && (
                <div className="absolute -left-3.5 top-0 bottom-0 w-2 bg-gradient-to-b from-amber-500 to-yellow-500 rounded-full shadow-lg shadow-amber-400/80 z-40 animate-pulse pointer-events-none" />
              )}

              {/* 主題左右拖曳放置引導線（右側） */}
              {isTargetAfter && (
                <div className="absolute -right-3.5 top-0 bottom-0 w-2 bg-gradient-to-b from-amber-500 to-yellow-500 rounded-full shadow-lg shadow-amber-400/80 z-40 animate-pulse pointer-events-none" />
              )}

              {/* 拖曳圖片覆蓋提示 */}
              {(isColumnDragging || isColumnUploading) && (
                <div className="absolute inset-0 z-30 bg-amber-500/90 text-white flex flex-col items-center justify-center p-4 text-center backdrop-blur-xs border-4 border-dashed border-white rounded-3xl animate-pulse pointer-events-none">
                  {isColumnUploading ? (
                    <>
                      <Loader2 className="w-12 h-12 mb-2 animate-spin" />
                      <p className="text-sm font-black">正在上傳檔案中...</p>
                      <p className="text-[11px] text-white/90 mt-1">上傳完成後將自動為您開啟便籤編輯！</p>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-12 h-12 mb-2" />
                      <p className="text-sm font-black">放開滑鼠以在此主題張貼照片或文件 📁</p>
                      <p className="text-[11px] text-white/90 mt-1">支援照片、PDF、Word、PPT 等檔案自動上傳</p>
                    </>
                  )}
                </div>
              )}

              {/* 欄位頭部（主題標題、拖曳把手與新增便籤按鈕，吸頂維持可見） */}
              <div className="sticky top-2 z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-t-3xl border-b border-gray-100 dark:border-slate-800 shadow-2xs">
                <div className="p-4 flex items-center justify-between gap-2">
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
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      {/* 左右拖曳主題欄位把手（僅看板擁有者/管理員可見） */}
                      {isOwnerOrAdmin && (
                        <div
                          draggable={true}
                          onDragStart={(e) => handleSectionDragStart(e, section.id)}
                          onDragEnd={handleDragEnd}
                          className="cursor-grab active:cursor-grabbing p-1 -ml-1 text-gray-400 hover:text-amber-600 hover:bg-amber-100/50 dark:hover:bg-slate-800 rounded-lg transition shrink-0"
                          title="按住左右拖曳調整主題欄位順序 ⇄"
                        >
                          <GripVertical className="w-4 h-4" />
                        </div>
                      )}

                      <h3 className="font-extrabold text-sm text-gray-900 dark:text-gray-100 truncate">
                        {section.title}
                      </h3>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 shrink-0">
                        {sectionPosts.length}
                      </span>
                    </div>
                  )}

                  {/* 看板擁有者管理選單 (重命名/刪除) */}
                  {isOwnerOrAdmin && editingSectionId !== section.id && (
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
                <div className="px-3 pb-3">
                  <button
                    onClick={() => onOpenCreatePost(section.id)}
                    className="w-full py-2 px-3 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 active:bg-amber-500/30 text-amber-900 dark:text-amber-300 font-bold text-xs flex items-center justify-center gap-1.5 border border-amber-300/40 transition shadow-2xs"
                  >
                    <Plus className="w-4 h-4 text-amber-600" />
                    <span>在此主題貼便籤</span>
                  </button>
                </div>
              </div>

              {/* 該主題下的便籤卡片垂直串流（隨便籤數量向下自然延伸，支援拖曳上下排列） */}
              <div
                onDragOver={(e) => handleSectionContainerDragOver(e, section.id)}
                className="p-3 space-y-3.5 min-h-[140px] flex-1"
              >
                {sectionPosts.length === 0 ? (
                  <div
                    onDrop={(e) => handlePostDrop(e, section.id)}
                    className={`text-center py-10 rounded-2xl border-2 border-dashed transition-colors flex flex-col items-center justify-center ${
                      postDropTarget?.sectionId === section.id && postDropTarget.position === 'empty'
                        ? 'border-amber-500 bg-amber-50/60 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200'
                        : 'border-gray-200 dark:border-slate-800 text-gray-400 dark:text-gray-500'
                    }`}
                  >
                    {postDropTarget?.sectionId === section.id && postDropTarget.position === 'empty' ? (
                      <span className="text-xs font-bold animate-pulse">放開滑鼠以將便籤移至此處 📥</span>
                    ) : (
                      <span className="text-xs font-medium leading-relaxed">
                        此主題尚無便籤，<br />
                        點擊上方按鈕或拖曳照片張貼！
                      </span>
                    )}
                  </div>
                ) : (
                  sectionPosts.map((post, idx) => {
                    const canDragPost =
                      isOwnerOrAdmin || Boolean(currentUser && post.authorId && currentUser.id === post.authorId);
                    const isBeingDragged = draggingPostId === post.id;
                    const isDropBefore =
                      postDropTarget?.sectionId === section.id &&
                      postDropTarget?.postId === post.id &&
                      postDropTarget?.position === 'before';
                    const isDropAfter =
                      postDropTarget?.sectionId === section.id &&
                      postDropTarget?.postId === post.id &&
                      postDropTarget?.position === 'after';

                    return (
                      <div
                        key={post.id}
                        onDragOver={(e) => handlePostDragOver(e, post.id, section.id)}
                        onDrop={(e) => handlePostDrop(e, section.id, post.id)}
                        className="relative"
                      >
                        {/* 拖曳落點導引線（上方） */}
                        {isDropBefore && (
                          <div className="absolute -top-2 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 to-yellow-500 rounded-full shadow-md shadow-amber-300 z-30 animate-pulse pointer-events-none" />
                        )}

                        <div
                          className={`relative rounded-3xl overflow-hidden transition-all duration-150 group ${
                            isBeingDragged ? 'opacity-30 scale-95 ring-2 ring-amber-400' : ''
                          }`}
                        >
                          {/* 便籤頂部拖曳把手列 */}
                          {canDragPost && (
                            <div
                              draggable={true}
                              onDragStart={(e) => handlePostDragStart(e, post.id, section.id)}
                              onDragEnd={handleDragEnd}
                              className="flex items-center justify-between px-3 py-1 bg-amber-50/90 dark:bg-slate-800/90 border-b border-amber-200/50 dark:border-slate-700/60 cursor-grab active:cursor-grabbing text-gray-500 hover:text-amber-800 dark:text-gray-400 dark:hover:text-amber-300 text-[10px] font-bold select-none transition-colors"
                              title="按住上下拖曳重新排列便籤 ⇅"
                            >
                              <span className="flex items-center gap-1">
                                <GripVertical className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                                <span>按住拖曳排序</span>
                              </span>
                              <span className="text-[10px] text-gray-400 font-mono">#{idx + 1}</span>
                            </div>
                          )}

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

                        {/* 拖曳落點導引線（下方） */}
                        {isDropAfter && (
                          <div className="absolute -bottom-2 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 to-yellow-500 rounded-full shadow-md shadow-amber-300 z-30 animate-pulse pointer-events-none" />
                        )}
                      </div>
                    );
                  })
                )}

                {/* 當拖曳便籤至欄位最底端時的放置區塊 */}
                {draggingPostId &&
                  sectionPosts.length > 0 &&
                  postDropTarget?.sectionId === section.id &&
                  postDropTarget.position === 'empty' && (
                    <div
                      onDrop={(e) => handlePostDrop(e, section.id)}
                      className="h-14 rounded-2xl border-2 border-dashed border-amber-500 bg-amber-50/60 dark:bg-amber-950/30 flex items-center justify-center text-amber-800 dark:text-amber-200 text-xs font-bold animate-pulse"
                    >
                      放開滑鼠放置於欄位最末端 📥
                    </div>
                  )}
              </div>
            </div>
          );
        })}

        {/* 最右側：新增主題分類欄位（僅看板擁有者/管理員可見） */}
        {isOwnerOrAdmin ? (
          <div className="w-76 sm:w-84 shrink-0 sticky top-2">
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
