'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Post, Comment, User, Section, MediaAttachment } from '@/types';
import { LinkifiedText } from '@/components/common/LinkifiedText';
import { LinkPreviewCard } from '@/components/media/LinkPreviewCard';
import { EditPostModal } from '@/components/board/EditPostModal';
import { findUrls, extractYouTubeId, getYouTubeThumbnail } from '@/lib/media';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Heart,
  MessageCircle,
  Send,
  Volume2,
  Sparkles,
  Clock,
  CheckCircle2,
  Trash2,
  Edit2,
  Folder,
  ExternalLink,
  Loader2,
} from 'lucide-react';

interface PostDetailModalProps {
  post: Post | null;
  allPosts: Post[];
  sections?: Section[];
  currentUser: User | null;
  isOwner: boolean;
  isOpen: boolean;
  onClose: () => void;
  onSelectPost: (post: Post) => void;
  onPostUpdated: (updatedPost: Post) => void;
  onPostDeleted: (postId: string) => void;
}

export function PostDetailModal({
  post,
  allPosts,
  sections = [],
  currentUser,
  isOwner,
  isOpen,
  onClose,
  onSelectPost,
  onPostUpdated,
  onPostDeleted,
}: PostDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [commentAuthor, setCommentAuthor] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  // 取得目前便籤在清單中的索引
  const currentIndex = post ? allPosts.findIndex((p) => p.id === post.id) : -1;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < allPosts.length - 1;

  const prevPost = hasPrev ? allPosts[currentIndex - 1] : null;
  const nextPost = hasNext ? allPosts[currentIndex + 1] : null;

  // 身分與權限判定
  const isAdmin = currentUser?.role === 'admin';
  const isTeacher = isOwner || currentUser?.role === 'teacher' || isAdmin;
  const isAuthor = Boolean(currentUser && post?.authorId && currentUser.id === post.authorId);
  const canDelete = isAdmin || isOwner || isAuthor;
  const canEdit = isAdmin || isOwner || isAuthor;

  // 取得所屬主題分類名稱
  const currentSection = sections.find((s) => s.id === post?.sectionId);

  // 載入便籤留言
  const loadComments = useCallback(async (postId: string) => {
    setLoadingComments(true);
    try {
      const res = await fetch(`/api/posts/${postId}/comments`);
      const data = await res.json();
      if (res.ok) {
        setComments(data.comments || []);
      }
    } catch {
      // 忽略
    } finally {
      setLoadingComments(false);
    }
  }, []);

  useEffect(() => {
    if (post && isOpen) {
      loadComments(post.id);
    }
  }, [post?.id, isOpen, loadComments]);

  // 鍵盤左右箭頭切換便籤、ESC 關閉彈窗
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      // 如果正在輸入留言或編輯，不觸發快速鍵
      const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (targetTag === 'input' || targetTag === 'textarea') {
        if (e.key === 'Escape') {
          (e.target as HTMLElement).blur();
        }
        return;
      }

      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft' && prevPost) {
        onSelectPost(prevPost);
      } else if (e.key === 'ArrowRight' && nextPost) {
        onSelectPost(nextPost);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, prevPost, nextPost, onClose, onSelectPost]);

  // 1. 圖片或語音檔案附件
  const fileAttachment = useMemo(() => {
    if (post?.attachment && (post.attachment.type === 'image' || post.attachment.type === 'audio')) {
      return post.attachment;
    }
    return null;
  }, [post?.attachment]);

  // 2. 解析出便籤中的所有外部連結與 YouTube (含附件與內文網址，去重複)
  const linkAttachments = useMemo(() => {
    if (!post) return [];
    const list: MediaAttachment[] = [];
    const seen = new Set<string>();

    if (post.attachment && post.attachment.type === 'link' && post.attachment.url) {
      list.push(post.attachment);
      seen.add(post.attachment.url.trim().toLowerCase());
    }

    const contentUrls = findUrls(post.content);
    for (const url of contentUrls) {
      const normalized = url.trim().toLowerCase();
      if (!seen.has(normalized)) {
        seen.add(normalized);
        const ytId = extractYouTubeId(url);
        list.push({
          type: 'link',
          url,
          title: ytId ? 'YouTube 影片' : url,
          metadata: ytId
            ? {
                youtubeId: ytId,
                ogImage: getYouTubeThumbnail(ytId),
              }
            : undefined,
        });
      }
    }

    return list;
  }, [post]);

  if (!isOpen || !post) return null;

  // 點讚
  const handleLike = async () => {
    if (isLiking) return;
    setIsLiking(true);
    try {
      const res = await fetch(`/api/posts/${post.id}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'like' }),
      });
      const data = await res.json();
      if (res.ok && data.post) {
        onPostUpdated(data.post);
      }
    } finally {
      setIsLiking(false);
    }
  };

  // 送出留言
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    if (!currentUser && (!commentAuthor || !commentAuthor.trim())) {
      alert('訪客留言請先填寫您的暱稱或座號！');
      return;
    }

    setSubmittingComment(true);

    try {
      const res = await fetch(`/api/posts/${post.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newComment.trim(),
          authorName: commentAuthor.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '留言失敗');
      }

      setComments((prev) => [...prev, data.comment]);
      setNewComment('');
      onPostUpdated({ ...post, commentCount: (post.commentCount || 0) + 1 });

      setTimeout(() => {
        commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '留言失敗';
      alert(msg);
    } finally {
      setSubmittingComment(false);
    }
  };

  // 審核通過
  const handleApprove = async () => {
    const res = await fetch('/api/posts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId: post.id, status: 'approved' }),
    });
    const data = await res.json();
    if (res.ok && data.post) {
      onPostUpdated(data.post);
    }
  };

  // 刪除貼文
  const handleDelete = async () => {
    if (!confirm('確定要刪除這則貼文嗎？')) return;
    const res = await fetch(`/api/posts?postId=${post.id}`, { method: 'DELETE' });
    if (res.ok) {
      onPostDeleted(post.id);
      onClose();
    } else {
      const data = await res.json();
      alert(data.error || '刪除失敗');
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleString([], {
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 md:p-10 bg-black/80 backdrop-blur-md animate-fade-in"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        {/* 浮動左右翻頁按鈕（桌面版位於彈窗外側） */}
        {hasPrev && (
          <button
            onClick={() => onSelectPost(prevPost!)}
            title="上一則便籤（鍵盤 ←）"
            className="hidden md:flex absolute left-4 lg:left-8 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/20 hover:bg-white text-white hover:text-gray-900 backdrop-blur-md items-center justify-center shadow-2xl transition duration-200 z-50 border border-white/20 group"
          >
            <ChevronLeft className="w-6 h-6 transition-transform group-hover:-translate-x-0.5" />
          </button>
        )}

        {hasNext && (
          <button
            onClick={() => onSelectPost(nextPost!)}
            title="下一則便籤（鍵盤 →）"
            className="hidden md:flex absolute right-4 lg:right-8 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/20 hover:bg-white text-white hover:text-gray-900 backdrop-blur-md items-center justify-center shadow-2xl transition duration-200 z-50 border border-white/20 group"
          >
            <ChevronRight className="w-6 h-6 transition-transform group-hover:translate-x-0.5" />
          </button>
        )}

        {/* 燈箱本體容器 */}
        <div
          className="bg-white dark:bg-slate-900 w-full max-w-5xl max-h-[92vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-black/10 relative animate-scale-up"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 頂部功能列：分欄標籤、序號計數與關閉 */}
          <div className="px-5 py-3.5 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-gray-50/80 dark:bg-slate-900/80 backdrop-blur">
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              {currentSection && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 text-xs font-black">
                  <Folder className="w-3.5 h-3.5 text-amber-600" />
                  <span className="truncate max-w-[160px]">{currentSection.title}</span>
                </span>
              )}
              {currentIndex >= 0 && allPosts.length > 0 && (
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                  第 {currentIndex + 1} / {allPosts.length} 則便籤
                </span>
              )}
              {post.status === 'pending' && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center gap-1">
                  <Clock className="w-3 h-3 animate-spin" />
                  待審核中
                </span>
              )}
            </div>

            {/* 手機版翻頁按鈕與關閉按鈕 */}
            <div className="flex items-center gap-1.5">
              <div className="flex md:hidden items-center gap-1 mr-1">
                <button
                  disabled={!hasPrev}
                  onClick={() => prevPost && onSelectPost(prevPost)}
                  className="p-1.5 rounded-lg bg-gray-200 dark:bg-slate-800 disabled:opacity-30 text-gray-700 dark:text-gray-300"
                  title="上一則"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  disabled={!hasNext}
                  onClick={() => nextPost && onSelectPost(nextPost)}
                  className="p-1.5 rounded-lg bg-gray-200 dark:bg-slate-800 disabled:opacity-30 text-gray-700 dark:text-gray-300"
                  title="下一則"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-slate-800 text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 transition"
                title="關閉 (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* 燈箱內容區：桌面雙欄 (左多媒體+長文 60%，右作者+討論 40%) */}
          <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-gray-100 dark:divide-slate-800">
            {/* 左側：成果作品展示區 (60%) */}
            <div className="lg:col-span-7 p-6 sm:p-8 space-y-6 overflow-y-auto">
              {/* 多媒體大版面展示 */}
              {(fileAttachment || linkAttachments.length > 0) && (
                <div className="space-y-4">
                  {/* 照片：高畫質大圖 */}
                  {fileAttachment?.type === 'image' && (
                    <div className="rounded-2xl overflow-hidden border border-black/5 bg-gray-50 dark:bg-slate-800/50 shadow-inner relative group/img flex items-center justify-center min-h-[260px] max-h-[500px]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={fileAttachment.url}
                        alt={fileAttachment.title || post.title || '便籤成果照片'}
                        className="w-full h-auto max-h-[500px] object-contain rounded-2xl"
                      />
                      <a
                        href={fileAttachment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute bottom-3 right-3 px-3 py-1.5 rounded-xl bg-black/70 hover:bg-black text-white text-xs font-bold backdrop-blur flex items-center gap-1.5 opacity-80 group-hover/img:opacity-100 transition shadow-md"
                        title="開啟完整高畫質原圖"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>檢視高畫質原圖</span>
                      </a>
                    </div>
                  )}

                  {/* 語音錄音：清晰波形與專屬大播放器 */}
                  {fileAttachment?.type === 'audio' && (
                    <div className="p-6 bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-2xl flex flex-col gap-3 border border-black/5">
                      <div className="flex items-center gap-3">
                        <div className="p-3 rounded-2xl bg-amber-600 text-white shadow-md">
                          <Volume2 className="w-6 h-6" />
                        </div>
                        <div>
                          <h5 className="text-sm font-black text-gray-900 dark:text-gray-100">
                            語音作業音訊
                          </h5>
                          <p className="text-xs text-gray-500">點擊播放聆聽錄音分享</p>
                        </div>
                      </div>
                      <audio controls src={fileAttachment.url} className="w-full mt-2" autoPlay={false} />
                    </div>
                  )}

                  {/* 外部連結或 YouTube：多個連結皆展示完整縮圖與預覽卡片 */}
                  {linkAttachments.length > 0 && (
                    <div className="space-y-3">
                      {linkAttachments.map((linkAtt, idx) => (
                        <LinkPreviewCard key={`${linkAtt.url}-${idx}`} attachment={linkAtt} />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 標題與內文 */}
              <div className="space-y-3">
                {post.title && (
                  <h2 className="text-xl sm:text-2xl font-black text-gray-950 dark:text-white leading-tight tracking-tight">
                    {post.title}
                  </h2>
                )}

                <div className="text-base text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed break-words font-medium">
                  <LinkifiedText text={post.content} />
                </div>
              </div>
            </div>

            {/* 右側：作者資訊、權限操作與完整討論串 (40%) */}
            <div className="lg:col-span-5 flex flex-col h-full bg-gray-50/40 dark:bg-slate-900/40">
              {/* 作者卡片與操作列 */}
              <div className="p-5 border-b border-gray-100 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center font-black text-base text-amber-800 dark:text-amber-300">
                      {post.authorName.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-black text-gray-950 dark:text-gray-100">
                          {post.authorName}
                        </span>
                        {post.isAuthorTeacher && (
                          <span className="text-[10px] bg-amber-600 text-white px-1.5 py-0.5 rounded-md font-bold inline-flex items-center gap-0.5">
                            <Sparkles className="w-2.5 h-2.5" />
                            教師
                          </span>
                        )}
                        {!post.authorId && (
                          <span className="text-[10px] bg-gray-200 text-gray-600 dark:bg-slate-800 dark:text-gray-400 px-1.5 py-0.5 rounded-md font-medium">
                            訪客
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400 block mt-0.5">
                        發表於 {formatDate(post.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* 權限按鈕：編輯與刪除 */}
                  <div className="flex items-center gap-1">
                    {canEdit && (
                      <button
                        onClick={() => setIsEditing(true)}
                        title="編輯此便籤"
                        className="p-2 rounded-xl text-gray-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-slate-800 transition"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={handleDelete}
                        title="刪除此便籤"
                        className="p-2 rounded-xl text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-800 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* 待審核操作（教師限定） */}
                {post.status === 'pending' && isTeacher && (
                  <div className="p-3 bg-amber-100/90 dark:bg-amber-950/50 rounded-2xl border border-amber-300 dark:border-amber-800 flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
                      學生發表待審核
                    </span>
                    <button
                      onClick={handleApprove}
                      className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>通過發布</span>
                    </button>
                  </div>
                )}

                {/* 點讚列 */}
                <div className="flex items-center gap-3 pt-1">
                  <button
                    onClick={handleLike}
                    disabled={isLiking}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-black transition shadow-xs ${
                      post.likeCount > 0
                        ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
                        : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-slate-700 hover:bg-gray-50'
                    }`}
                  >
                    <Heart
                      className={`w-4 h-4 ${post.likeCount > 0 ? 'fill-red-500 text-red-500' : ''}`}
                    />
                    <span>{post.likeCount > 0 ? `${post.likeCount} 個讚` : '點讚鼓勵'}</span>
                  </button>

                  <div className="text-xs font-bold text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <MessageCircle className="w-4 h-4" />
                    <span>{comments.length} 則留言</span>
                  </div>
                </div>
              </div>

              {/* 留言討論串（可滾動） */}
              <div className="flex-1 p-5 overflow-y-auto space-y-3 min-h-[160px] max-h-[360px] lg:max-h-none">
                <div className="text-xs font-black text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                  <MessageCircle className="w-3.5 h-3.5 text-amber-600" />
                  <span>同學與師長回饋：</span>
                </div>

                {loadingComments ? (
                  <div className="flex items-center justify-center py-8 text-gray-400">
                    <Loader2 className="w-5 h-5 animate-spin" />
                  </div>
                ) : comments.length === 0 ? (
                  <div className="text-center py-8 text-xs text-gray-400 font-medium bg-white/50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-gray-200 dark:border-slate-800">
                    目前還沒有留言，快來留下第一句鼓勵吧！
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {comments.map((c) => (
                      <div
                        key={c.id}
                        className="bg-white dark:bg-slate-800 p-3 rounded-2xl border border-gray-100 dark:border-slate-700/60 shadow-2xs space-y-1"
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-gray-900 dark:text-gray-200">
                            {c.authorName}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            {formatDate(c.createdAt)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed break-words whitespace-pre-wrap font-medium">
                          {c.content}
                        </p>
                      </div>
                    ))}
                    <div ref={commentsEndRef} />
                  </div>
                )}
              </div>

              {/* 底部：留言輸入框 */}
              <form
                onSubmit={handleAddComment}
                className="p-4 border-t border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2"
              >
                {!currentUser && (
                  <input
                    type="text"
                    required
                    placeholder="你的名字或座號（訪客必填）"
                    value={commentAuthor}
                    onChange={(e) => setCommentAuthor(e.target.value)}
                    className="w-full text-xs font-bold bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 outline-hidden focus:border-amber-600 text-gray-900 dark:text-white"
                  />
                )}
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="寫下你的心得、提問或鼓勵..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="flex-1 text-xs font-bold bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 outline-hidden focus:border-amber-600 text-gray-900 dark:text-white"
                  />
                  <button
                    type="submit"
                    disabled={submittingComment || !newComment.trim()}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-black shadow-xs transition flex items-center gap-1 shrink-0"
                  >
                    {submittingComment ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    <span>送出</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* 編輯貼文彈窗 */}
      {isEditing && (
        <EditPostModal
          post={post}
          sections={sections}
          isOpen={isEditing}
          onClose={() => setIsEditing(false)}
          onPostUpdated={(updated) => {
            onPostUpdated(updated);
            onSelectPost(updated);
            setIsEditing(false);
          }}
        />
      )}
    </>
  );
}
