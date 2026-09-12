'use client';

import React, { useState, useEffect, use, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Board, Post, User, Section, MediaAttachment } from '@/types';
import { Navbar } from '@/components/common/Navbar';
import { ShelfView } from '@/components/board/ShelfView';
import { CreatePostModal } from '@/components/board/CreatePostModal';
import { QRCodeModal } from '@/components/board/QRCodeModal';
import { CreateBoardModal } from '@/components/board/CreateBoardModal';
import { BoardSettingsModal } from '@/components/board/BoardSettingsModal';
import { PostDetailModal } from '@/components/board/PostDetailModal';
import {
  QrCode,
  Plus,
  ArrowLeft,
  ShieldCheck,
  UserCheck,
  Radio,
  Layers,
  Settings,
  Globe,
  Lock,
} from 'lucide-react';

export default function BoardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [board, setBoard] = useState<Board | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRestricted, setIsRestricted] = useState(false);

  // 彈窗狀態
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [initialAttachment, setInitialAttachment] = useState<MediaAttachment | undefined>(undefined);
  const [activeSectionId, setActiveSectionId] = useState<string | undefined>(undefined);
  const [isQRCodeOpen, setIsQRCodeOpen] = useState(false);
  const [isCreateBoardOpen, setIsCreateBoardOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  // 載入看板資料
  const fetchBoardData = useCallback(async () => {
    try {
      const res = await fetch(`/api/boards/${id}`);
      const data = await res.json();
      if (!res.ok) {
        if (data.isRestricted) {
          setIsRestricted(true);
          setError('🔒 此看板為校內私人看板，請先以學校帳號登入後檢視！');
          return;
        }
        throw new Error(data.error || '找不到此看板或已被移除');
      }
      setBoard(data.board);
      setSections(data.sections || []);
      setPosts(data.posts || []);
      setIsOwner(data.isOwner);
      setCurrentUser(data.currentUser);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '載入看板失敗';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchBoardData();
  }, [fetchBoardData]);

  // 設定 SSE 即時同步監聽
  useEffect(() => {
    if (!id || isRestricted) return;
    const eventSource = new EventSource(`/api/boards/${id}/stream`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'sync' && Array.isArray(data.posts)) {
          setPosts(data.posts);
          setSelectedPost((curr) =>
            curr ? data.posts.find((p: Post) => p.id === curr.id) || curr : null
          );
        }
      } catch {
        // 忽略
      }
    };

    return () => {
      eventSource.close();
    };
  }, [id, isRestricted]);

  const handlePostUpdated = (updatedPost: Post) => {
    setPosts((prev) => prev.map((p) => (p.id === updatedPost.id ? updatedPost : p)));
    setSelectedPost((curr) => (curr?.id === updatedPost.id ? updatedPost : curr));
  };

  const handlePostDeleted = (postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    setSelectedPost((curr) => (curr?.id === postId ? null : curr));
  };

  const handleOpenCreatePost = (sectionId?: string, attachment?: MediaAttachment) => {
    if (board && !board.allowGuest && !currentUser) {
      alert('此看板目前設定「需登入帳號才可發表」，請先登入您的帳號！');
      router.push('/login');
      return;
    }
    setActiveSectionId(sectionId);
    setInitialAttachment(attachment);
    setIsCreatePostOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-amber-50/30 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center text-2xl animate-bounce">
            🦌
          </div>
          <p className="text-sm font-bold text-gray-700">正在前往鹿鳴牆看板...</p>
        </div>
      </div>
    );
  }

  // 私人看板未登入提示
  if (isRestricted) {
    return (
      <div className="min-h-screen bg-amber-50/30 flex flex-col">
        <Navbar onOpenCreateBoard={() => setIsCreateBoardOpen(true)} />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-3xl max-w-md w-full text-center shadow-lg border border-amber-100">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center text-2xl">
              🔒
            </div>
            <h3 className="text-lg font-black text-gray-900 mb-2">校內專屬私人看板</h3>
            <p className="text-xs text-gray-600 mb-6 leading-relaxed">
              此看板已被設定為校內專屬，未登入者無法瀏覽內容。請先登入帳號後檢視！
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-amber-600 text-white text-xs font-bold shadow-xs hover:bg-amber-700 transition"
              >
                前往登入 🪪
              </Link>
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-xs font-bold hover:bg-gray-200 transition"
              >
                返回大廳
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !board) {
    return (
      <div className="min-h-screen bg-amber-50/30 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl max-w-md w-full text-center shadow-lg border border-amber-100">
          <div className="text-4xl mb-3">🍃</div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">抱歉，找不到這個看板</h3>
          <p className="text-xs text-gray-500 mb-6">{error || '看板可能已不存在'}</p>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-600 text-white text-xs font-bold shadow-xs hover:bg-amber-700"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>返回大廳</span>
          </Link>
        </div>
      </div>
    );
  }

  const isTeacherOrAdmin = isOwner || currentUser?.role === 'teacher' || currentUser?.role === 'admin';

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/30 via-white to-amber-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex flex-col">
      <Navbar onOpenCreateBoard={() => setIsCreateBoardOpen(true)} />

      {/* 看板頂部橫幅 */}
      <div className={`w-full bg-gradient-to-r ${board.coverColor || 'from-emerald-500 to-teal-700'} text-white shadow-md transition-all`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* 標題與說明 */}
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 mb-2">
                <Link
                  href="/"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-black/20 hover:bg-black/30 text-[11px] font-semibold backdrop-blur transition"
                >
                  <ArrowLeft className="w-3 h-3" />
                  <span>所有看板</span>
                </Link>
                <span className="px-2 py-0.5 rounded-md bg-white/20 text-[11px] font-bold backdrop-blur flex items-center gap-1">
                  <Layers className="w-3 h-3" />
                  多主題分欄 Shelf
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-400/30 text-emerald-100 text-[11px] font-medium backdrop-blur">
                  <Radio className="w-3 h-3 animate-pulse" />
                  即時連線中
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black tracking-tight drop-shadow-xs mb-1.5">
                {board.title}
              </h1>

              {board.description && (
                <p className="text-xs sm:text-sm text-white/90 leading-relaxed font-medium">
                  {board.description}
                </p>
              )}

              {/* 課堂機制徽章 */}
              <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/20 text-white/90">
                  板主：{board.creatorName}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/20 text-white">
                  主題分類：{sections.length} 個
                </span>
                {board.isPublic === false ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-400/30 text-amber-100 font-bold">
                    <Lock className="w-3 h-3" />
                    校內私人看板
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/20 text-white">
                    <Globe className="w-3 h-3" />
                    公開看板
                  </span>
                )}
                {board.allowGuest ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/20 text-white">
                    <UserCheck className="w-3 h-3" />
                    學生免登入可寫
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/20 text-white/90">
                    需登入才可發表
                  </span>
                )}
                {board.requireApproval && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-400/30 text-amber-100 font-bold">
                    <ShieldCheck className="w-3 h-3" />
                    需教師審核
                  </span>
                )}
              </div>
            </div>

            {/* 操作按鈕群（投影 QR Code、看板設定、新增卡片） */}
            <div className="flex flex-wrap items-center gap-2 sm:self-end">
              {/* QR Code 投影 */}
              <button
                onClick={() => setIsQRCodeOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-white/20 hover:bg-white/30 active:bg-white/40 text-white text-xs font-bold backdrop-blur border border-white/20 shadow-xs transition"
              >
                <QrCode className="w-4 h-4" />
                <span>投影 QR Code 📱</span>
              </button>

              {/* 教師 / 管理員專屬：看板設定按鈕 */}
              {isTeacherOrAdmin && (
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-white/20 hover:bg-white/30 active:bg-white/40 text-white text-xs font-bold backdrop-blur border border-white/20 shadow-xs transition"
                  title="管理看板隱私與發表權限"
                >
                  <Settings className="w-4 h-4" />
                  <span>看板設定 ⚙️</span>
                </button>
              )}

              {/* 新增便籤 */}
              <button
                onClick={() => handleOpenCreatePost()}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-2xl bg-white text-gray-900 hover:bg-amber-50 text-xs font-black shadow-md transition transform active:scale-95"
              >
                <Plus className="w-4 h-4 text-amber-600" />
                <span>貼便籤 📝</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 多主題分欄內容主體 */}
      <main className="flex-1 w-full pb-16">
        <ShelfView
          board={board}
          sections={sections}
          posts={posts}
          currentUser={currentUser}
          isOwner={isOwner}
          onPostClick={(post) => setSelectedPost(post)}
          onOpenCreatePost={handleOpenCreatePost}
          onPostUpdated={handlePostUpdated}
          onPostDeleted={handlePostDeleted}
          onSectionsUpdated={fetchBoardData}
        />
      </main>

      {/* 彈窗元件 */}
      {selectedPost && (
        <PostDetailModal
          post={selectedPost}
          allPosts={posts}
          sections={sections}
          currentUser={currentUser}
          isOwner={isOwner}
          isOpen={Boolean(selectedPost)}
          onClose={() => setSelectedPost(null)}
          onSelectPost={(p) => setSelectedPost(p)}
          onPostUpdated={handlePostUpdated}
          onPostDeleted={handlePostDeleted}
        />
      )}

      <CreatePostModal
        board={board}
        sections={sections}
        defaultSectionId={activeSectionId}
        initialAttachment={initialAttachment}
        initialMediaType={initialAttachment?.type || 'none'}
        currentUser={currentUser}
        isOpen={isCreatePostOpen}
        onClose={() => {
          setIsCreatePostOpen(false);
          setInitialAttachment(undefined);
        }}
        onPostCreated={fetchBoardData}
      />

      <QRCodeModal
        boardTitle={board.title}
        isOpen={isQRCodeOpen}
        onClose={() => setIsQRCodeOpen(false)}
      />

      <CreateBoardModal
        isOpen={isCreateBoardOpen}
        onClose={() => setIsCreateBoardOpen(false)}
        onBoardCreated={() => router.refresh()}
      />

      <BoardSettingsModal
        board={board}
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onBoardUpdated={(updatedBoard) => setBoard(updatedBoard)}
      />
    </div>
  );
}
