'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Board, Post, User, Section, MediaAttachment } from '@/types';
import { PostCard } from './PostCard';
import {
  Plus,
  Compass,
  GripVertical,
  Clock,
  Filter,
  Sparkles,
  MousePointerClick,
  Info,
} from 'lucide-react';

interface CanvasViewProps {
  board: Board;
  sections: Section[];
  posts: Post[];
  currentUser: User | null;
  isOwner: boolean;
  onPostClick?: (post: Post) => void;
  onOpenCreatePost: (
    sectionId?: string,
    initialAttachment?: MediaAttachment,
    initialPos?: { x: number; y: number }
  ) => void;
  onPostUpdated: (post: Post) => void;
  onPostDeleted: (postId: string) => void;
  onSectionsUpdated: () => void;
}

export function CanvasView({
  board: _board,
  sections,
  posts,
  currentUser,
  isOwner,
  onPostClick,
  onOpenCreatePost,
  onPostUpdated,
  onPostDeleted,
}: CanvasViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // 畫布平移視角 offset
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ mouseX: number; mouseY: number; startX: number; startY: number }>({
    mouseX: 0,
    mouseY: 0,
    startX: 0,
    startY: 0,
  });

  // 卡片即時拖曳座標（本地樂觀狀態）
  const [draggedPositions, setDraggedPositions] = useState<Record<string, { x: number; y: number }>>({});
  const activeDragRef = useRef<{
    postId: string;
    startMouseX: number;
    startMouseY: number;
    initialCardX: number;
    initialCardY: number;
    currentX: number;
    currentY: number;
  } | null>(null);

  const [filterPendingOnly, setFilterPendingOnly] = useState(false);

  // 身分與權限判斷（嚴格限定開板老師或管理員）
  const isOwnerOrAdmin = isOwner || currentUser?.role === 'admin';
  const pendingCount = posts.filter((p) => p.status === 'pending').length;

  // 計算便籤的有效座標（若尚未設定座標，依序排列在安全網格）
  const getPostPosition = useCallback(
    (post: Post, index: number): { x: number; y: number } => {
      if (draggedPositions[post.id]) {
        return draggedPositions[post.id];
      }
      if (typeof post.posX === 'number' && typeof post.posY === 'number') {
        return { x: post.posX, y: post.posY };
      }
      // 預設網格排列：每欄 4 張卡片，安全避開
      const col = index % 4;
      const row = Math.floor(index / 4);
      return {
        x: 80 + col * 360,
        y: 100 + row * 400,
      };
    },
    [draggedPositions]
  );

  // ----------------------------------------------------
  // 1. 畫布背景平移（Pan）邏輯
  // ----------------------------------------------------
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    // 只有在背景上按下滑鼠時才觸發平移
    if ((e.target as HTMLElement).closest('.post-card-container')) {
      return;
    }
    setIsPanning(true);
    panStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startX: panOffset.x,
      startY: panOffset.y,
    };
  };

  // 雙擊畫布空白處直接貼便籤
  const handleCanvasDoubleClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.post-card-container')) {
      return;
    }
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const canvasX = Math.round(e.clientX - rect.left - panOffset.x);
    const canvasY = Math.round(e.clientY - rect.top - panOffset.y);

    onOpenCreatePost(undefined, undefined, { x: Math.max(20, canvasX), y: Math.max(20, canvasY) });
  };

  // ----------------------------------------------------
  // 2. 便籤卡片拖曳移動邏輯
  // ----------------------------------------------------
  const handleCardDragStart = (postId: string, e: React.MouseEvent, currentPos: { x: number; y: number }) => {
    e.stopPropagation();
    activeDragRef.current = {
      postId,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      initialCardX: currentPos.x,
      initialCardY: currentPos.y,
      currentX: currentPos.x,
      currentY: currentPos.y,
    };
  };

  // 全域 MouseMove 與 MouseUp 監聽，保證拖曳手感絲滑不掉針
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // 處理畫布平移
      if (isPanning) {
        const dx = e.clientX - panStartRef.current.mouseX;
        const dy = e.clientY - panStartRef.current.mouseY;
        setPanOffset({
          x: panStartRef.current.startX + dx,
          y: panStartRef.current.startY + dy,
        });
        return;
      }

      // 處理卡片拖曳
      if (activeDragRef.current) {
        const dx = e.clientX - activeDragRef.current.startMouseX;
        const dy = e.clientY - activeDragRef.current.startMouseY;
        const newX = Math.max(20, Math.round(activeDragRef.current.initialCardX + dx));
        const newY = Math.max(20, Math.round(activeDragRef.current.initialCardY + dy));

        activeDragRef.current.currentX = newX;
        activeDragRef.current.currentY = newY;

        setDraggedPositions((prev) => ({
          ...prev,
          [activeDragRef.current!.postId]: { x: newX, y: newY },
        }));
      }
    };

    const handleMouseUp = async () => {
      if (isPanning) {
        setIsPanning(false);
      }

      if (activeDragRef.current) {
        const { postId, currentX, currentY, initialCardX, initialCardY } = activeDragRef.current;
        activeDragRef.current = null;

        // 若位置有實際移動，發送 PATCH 保存座標
        if (currentX !== initialCardX || currentY !== initialCardY) {
          try {
            const res = await fetch('/api/posts', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                postId,
                posX: currentX,
                posY: currentY,
              }),
            });
            const data = await res.json();
            if (res.ok && data.post) {
              onPostUpdated(data.post);
            }
          } catch (err) {
            console.error('儲存便籤畫布座標失敗:', err);
          }
        }
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isPanning, onPostUpdated]);

  // 視角置中 / 歸位
  const handleResetView = () => {
    setPanOffset({ x: 0, y: 0 });
  };

  const displayedPosts = filterPendingOnly
    ? posts.filter((p) => p.status === 'pending')
    : posts;

  return (
    <div className="w-full relative overflow-hidden select-none">
      {/* 畫布視窗容器 */}
      <div
        ref={containerRef}
        onMouseDown={handleCanvasMouseDown}
        onDoubleClick={handleCanvasDoubleClick}
        style={{
          height: 'calc(100vh - 160px)',
          minHeight: '620px',
          cursor: isPanning ? 'grabbing' : 'default',
          backgroundImage:
            'radial-gradient(circle, #cbd5e1 1.5px, transparent 1.5px)',
          backgroundSize: '32px 32px',
        }}
        className="w-full bg-slate-50/70 dark:bg-slate-950/80 relative overflow-hidden transition-colors"
      >
        {/* 浮動提示 1：開板老師審核提醒列（毛玻璃效果浮動於頂部中央） */}
        {isOwnerOrAdmin && pendingCount > 0 && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 px-4 py-2 rounded-2xl bg-amber-500/90 hover:bg-amber-500 text-white shadow-xl backdrop-blur-md border border-white/20 transition animate-fade-in">
            <Clock className="w-4 h-4 animate-spin shrink-0" />
            <span className="text-xs font-black">
              目前有 {pendingCount} 則學生貼文等待您審核
            </span>
            <button
              onClick={() => setFilterPendingOnly(!filterPendingOnly)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white text-amber-900 text-[11px] font-black shadow-xs hover:bg-amber-50 transition"
            >
              <Filter className="w-3 h-3" />
              <span>{filterPendingOnly ? '顯示全部' : '僅看待審核'}</span>
            </button>
          </div>
        )}

        {/* 學生/非板主視角：若有待審核便籤的浮動提醒 */}
        {!isOwnerOrAdmin && pendingCount > 0 && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-amber-500/90 text-white shadow-xl backdrop-blur-md border border-white/20 animate-fade-in text-xs font-bold">
            <Clock className="w-4 h-4 animate-spin shrink-0" />
            <span>您有 {pendingCount} 則發布的便籤正在「等待老師同意中」</span>
          </div>
        )}

        {/* 浮動提示 2：左下角操作教學小卡 */}
        <div className="hidden sm:flex absolute bottom-5 left-6 z-20 items-center gap-2 px-3 py-1.5 rounded-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-black/5 dark:border-white/10 shadow-xs text-[11px] text-gray-500 dark:text-gray-400 pointer-events-none">
          <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>💡 按住空白處可平移畫布，雙擊空白處可快速貼便籤，拖曳頂部手把可隨意移動位置</span>
        </div>

        {/* 浮動控制列：右下角視角歸位與貼便籤捷徑 */}
        <div className="absolute bottom-5 right-6 z-30 flex items-center gap-2">
          <button
            onClick={handleResetView}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-800 text-gray-700 dark:text-gray-200 text-xs font-black shadow-lg backdrop-blur border border-black/5 dark:border-white/10 transition active:scale-95"
            title="將畫布視角重設回復至原點"
          >
            <Compass className="w-4 h-4 text-amber-600" />
            <span className="hidden sm:inline">視角歸位</span>
          </button>

          <button
            onClick={() => onOpenCreatePost()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black shadow-lg transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>貼便籤 📝</span>
          </button>
        </div>

        {/* 自由平移畫布世界 (Canvas World) */}
        <div
          style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px)`,
            width: '4000px',
            height: '3500px',
          }}
          className="absolute inset-0 transform-gpu pointer-events-auto"
        >
          {displayedPosts.length === 0 ? (
            <div className="absolute top-24 left-24 p-8 max-w-sm bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-3xl border border-dashed border-gray-300 dark:border-slate-700 shadow-md text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center text-2xl">
                🦌
              </div>
              <h4 className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-1">
                自由畫布已就緒！
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">
                在任意空白處「連按兩下滑鼠」，即可在該座標貼上第一張便籤！
              </p>
              <button
                onClick={() => onOpenCreatePost(undefined, undefined, { x: 120, y: 120 })}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-black shadow-md hover:bg-amber-700 transition"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>立即建立便籤</span>
              </button>
            </div>
          ) : (
            displayedPosts.map((post, idx) => {
              const pos = getPostPosition(post, idx);
              const isBeingDragged = activeDragRef.current?.postId === post.id;

              return (
                <div
                  key={post.id}
                  style={{
                    position: 'absolute',
                    left: `${pos.x}px`,
                    top: `${pos.y}px`,
                    width: '320px',
                    zIndex: isBeingDragged ? 40 : 10,
                  }}
                  className={`post-card-container transition-shadow ${
                    isBeingDragged
                      ? 'shadow-2xl scale-[1.02] rotate-1 ring-2 ring-amber-400 rounded-3xl'
                      : 'hover:z-20'
                  }`}
                >
                  {/* 便籤卡片上方精緻拖曳手把列 */}
                  <div
                    onMouseDown={(e) => handleCardDragStart(post.id, e, pos)}
                    className="flex items-center justify-between px-3 py-1.5 bg-black/10 hover:bg-black/15 dark:bg-white/10 dark:hover:bg-white/20 rounded-t-2xl cursor-grab active:cursor-grabbing border-b border-black/5 transition"
                    title="按住此處可任意拖曳移動便籤位置"
                  >
                    <div className="flex items-center gap-1.5 text-[11px] font-black text-gray-700 dark:text-gray-200">
                      <GripVertical className="w-3.5 h-3.5 text-gray-500" />
                      <span>拖曳移動</span>
                    </div>
                    <span className="text-[10px] text-gray-500 font-mono">
                      X:{Math.round(pos.x)} Y:{Math.round(pos.y)}
                    </span>
                  </div>

                  {/* 便籤本體卡片 */}
                  <div className="rounded-b-2xl overflow-hidden shadow-sm">
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
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
