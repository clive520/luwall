'use client';

import React, { useState, useMemo } from 'react';
import { Post, Comment, User, Section } from '@/types';
import { LinkifiedText } from '@/components/common/LinkifiedText';
import { LinkPreviewCard } from '@/components/media/LinkPreviewCard';
import { EditPostModal } from '@/components/board/EditPostModal';
import { findUrls, extractYouTubeId, getYouTubeThumbnail } from '@/lib/media';
import {
  Heart,
  MessageCircle,
  Trash2,
  CheckCircle2,
  ExternalLink,
  Volume2,
  Clock,
  Send,
  Sparkles,
  Crown,
  Edit2,
} from 'lucide-react';

interface PostCardProps {
  post: Post;
  sections?: Section[];
  currentUser: User | null;
  isOwner: boolean; // 看板擁有者 (教師或管理員)
  onPostClick?: (post: Post) => void;
  onPostUpdated: (updatedPost: Post) => void;
  onPostDeleted: (postId: string) => void;
}

export function PostCard({
  post,
  sections,
  currentUser,
  isOwner,
  onPostClick,
  onPostUpdated,
  onPostDeleted,
}: PostCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [commentAuthor, setCommentAuthor] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [isLiking, setIsLiking] = useState(false);

  // 身分與權限判斷
  const isAdmin = currentUser?.role === 'admin';
  const isTeacher = isOwner || currentUser?.role === 'teacher' || isAdmin;
  const isAuthor = currentUser && post.authorId && currentUser.id === post.authorId;

  // 刪除權限控制：
  // 1. 訪客 (未登入)：不可刪除 (canDelete = false)
  // 2. 學生：僅能刪除自己發表的 (isAuthor)
  // 3. 看板教師：可刪除看板內所有卡片 (isOwner)
  // 4. 管理員：全域可刪除 (isAdmin)
  const canDelete = isAdmin || isOwner || isAuthor;
  const canEdit = isAdmin || isOwner || isAuthor;

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

  // 載入留言
  const loadComments = async () => {
    if (showComments) {
      setShowComments(false);
      return;
    }
    setShowComments(true);
    setLoadingComments(true);
    try {
      const res = await fetch(`/api/posts/${post.id}/comments`);
      const data = await res.json();
      if (res.ok) {
        setComments(data.comments || []);
      }
    } finally {
      setLoadingComments(false);
    }
  };

  // 送出留言
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    if (!currentUser && (!commentAuthor || !commentAuthor.trim())) {
      alert('訪客留言請先填寫您的暱稱！');
      return;
    }

    setSubmittingComment(true);

    try {
      const res = await fetch(`/api/posts/${post.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newComment,
          authorName: commentAuthor,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '留言失敗');
      }

      setComments((prev) => [...prev, data.comment]);
      setNewComment('');
      onPostUpdated({ ...post, commentCount: (post.commentCount || 0) + 1 });
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
    } else {
      const data = await res.json();
      alert(data.error || '刪除失敗');
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // 自動解析附件：若無 attachment，但 content 中含有網址 (YouTube 或一般連結)，自動作為預覽附件 (以 useMemo 快取避免重複正規表達式運算)
  const effectiveAttachment = useMemo(() => {
    if (post.attachment) return post.attachment;
    const urls = findUrls(post.content);
    if (urls.length === 0) return null;
    const url = urls[0];
    const ytId = extractYouTubeId(url);
    return {
      type: 'link' as const,
      url,
      title: ytId ? 'YouTube 影片' : url,
      metadata: ytId
        ? {
            youtubeId: ytId,
            ogImage: getYouTubeThumbnail(ytId),
          }
        : undefined,
    };
  }, [post.attachment, post.content]);

  return (
    <div
      onClick={() => onPostClick?.(post)}
      style={{ backgroundColor: post.color || '#ffffff' }}
      className={`rounded-3xl p-5 sm:p-6 shadow-sm hover:shadow-lg hover:-translate-y-0.5 cursor-pointer transition-all duration-200 border border-black/5 relative group flex flex-col justify-between ${
        post.status === 'pending' ? 'ring-2 ring-amber-400/80' : ''
      }`}
    >
      {/* 待審核標籤 */}
      {post.status === 'pending' && (
        <div className="absolute -top-3 left-6 px-3 py-0.5 rounded-full bg-amber-500 text-white text-xs font-bold shadow-xs flex items-center gap-1">
          <Clock className="w-3 h-3 animate-spin" />
          <span>待審核中</span>
        </div>
      )}

      {/* 卡片頭部 */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-black/10 flex items-center justify-center font-bold text-sm text-gray-800">
              {post.authorName.charAt(0)}
            </div>
            <div>
              <div className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                <span>{post.authorName}</span>
                {post.isAuthorTeacher && (
                  <span className="text-[10px] bg-amber-600 text-white px-1.5 py-0.2 rounded-md font-semibold inline-flex items-center gap-0.5">
                    <Sparkles className="w-2.5 h-2.5" />
                    教師
                  </span>
                )}
                {!post.authorId && (
                  <span className="text-[10px] bg-gray-200/80 text-gray-600 px-1.5 py-0.2 rounded-md font-medium">
                    訪客
                  </span>
                )}
              </div>
              <span className="text-[11px] text-gray-500 block">
                {formatDate(post.createdAt)}
              </span>
            </div>
          </div>

          {/* 右上角操作選單 (僅符合身分權限者可見) */}
          <div className="flex items-center gap-1">
            {canEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditing(true);
                }}
                title="編輯便籤內容"
                className="opacity-60 group-hover:opacity-100 p-1.5 text-gray-500 hover:text-amber-600 hover:bg-black/5 rounded-lg transition"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
            {canDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete();
                }}
                title={isAdmin ? '管理員刪除' : isOwner ? '教師刪除' : '刪除我的貼文'}
                className="opacity-60 group-hover:opacity-100 p-1.5 text-gray-500 hover:text-red-600 hover:bg-black/5 rounded-lg transition"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* 標題與內文 (支援網址自動超連結化) */}
        {post.title && (
          <h4 className="text-base sm:text-lg font-black text-gray-950 mb-1.5 leading-snug">
            {post.title}
          </h4>
        )}
        <div className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed break-words font-medium">
          <LinkifiedText text={post.content} />
        </div>

        {/* 多媒體附件區 */}
        {effectiveAttachment && (
          <div className="mt-3.5">
            {/* 圖片 */}
            {effectiveAttachment.type === 'image' && (
              <div className="rounded-2xl overflow-hidden border border-black/5 bg-black/5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={effectiveAttachment.url}
                  alt={effectiveAttachment.title || '貼文照片'}
                  className="w-full max-h-96 object-cover rounded-2xl transition hover:scale-[1.01]"
                />
              </div>
            )}

            {/* 錄音音訊 */}
            {effectiveAttachment.type === 'audio' && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="p-3.5 bg-white/70 backdrop-blur rounded-2xl flex items-center gap-3 border border-black/5"
              >
                <div className="p-2.5 rounded-full bg-amber-600 text-white shadow-xs">
                  <Volume2 className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-gray-800 mb-1">語音分享作業</div>
                  <audio controls src={effectiveAttachment.url} className="w-full h-8" />
                </div>
              </div>
            )}

            {/* 外部連結或 YouTube (含縮圖、可點擊與原地播放) */}
            {effectiveAttachment.type === 'link' && (
              <div onClick={(e) => e.stopPropagation()}>
                <LinkPreviewCard attachment={effectiveAttachment} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* 審核操作區（僅看板教師或管理員可操作） */}
      {post.status === 'pending' && isTeacher && (
        <div className="mt-4 p-2.5 bg-amber-100/80 rounded-2xl border border-amber-300 flex items-center justify-between">
          <span className="text-xs font-bold text-amber-900">
            學生發表待審核
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleApprove();
              }}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>通過發布</span>
            </button>
          </div>
        </div>
      )}

      {/* 底部互動列 */}
      <div className="mt-4 pt-3 border-t border-black/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* 點讚 */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleLike();
            }}
            disabled={isLiking}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition ${
              post.likeCount > 0
                ? 'bg-red-50 text-red-600 hover:bg-red-100'
                : 'text-gray-600 hover:bg-black/5'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${post.likeCount > 0 ? 'fill-red-500 text-red-500' : ''}`} />
            <span>{post.likeCount > 0 ? post.likeCount : '讚'}</span>
          </button>

          {/* 留言切換 */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              loadComments();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-gray-600 hover:bg-black/5 transition"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>{post.commentCount > 0 ? `${post.commentCount} 則留言` : '留言'}</span>
          </button>
        </div>
      </div>

      {/* 留言抽屜展開 */}
      {showComments && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="mt-3 pt-3 border-t border-black/5 space-y-2"
        >
          {loadingComments ? (
            <div className="text-xs text-gray-400 text-center py-2">載入留言中...</div>
          ) : comments.length === 0 ? (
            <div className="text-xs text-gray-400 text-center py-1">還沒有留言，快來第一個留言吧！</div>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {comments.map((c) => (
                <div key={c.id} className="bg-white/80 p-2.5 rounded-xl text-xs shadow-2xs">
                  <div className="font-bold text-gray-800 mb-0.5">{c.authorName}</div>
                  <div className="text-gray-700 whitespace-pre-wrap">{c.content}</div>
                </div>
              ))}
            </div>
          )}

          {/* 留言輸入框 */}
          <form onSubmit={handleAddComment} className="mt-2 space-y-2">
            {!currentUser && (
              <input
                type="text"
                required
                placeholder="請輸入您的暱稱（訪客必填）*"
                value={commentAuthor}
                onChange={(e) => setCommentAuthor(e.target.value)}
                className="w-full text-xs font-bold bg-white text-gray-950 placeholder:text-gray-500 border-2 border-gray-300 rounded-xl px-3 py-2 outline-hidden focus:border-amber-600 focus:ring-1 focus:ring-amber-200 shadow-2xs"
              />
            )}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="寫下你的想法或回饋..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="flex-1 text-xs font-bold bg-white text-gray-950 placeholder:text-gray-500 border-2 border-gray-300 rounded-xl px-3 py-2 outline-hidden focus:border-amber-600 focus:ring-1 focus:ring-amber-200 shadow-2xs"
              />
              <button
                type="submit"
                disabled={submittingComment || !newComment.trim()}
                className="px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50 transition shadow-xs font-bold flex items-center justify-center"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 編輯便籤彈窗 */}
      {isEditing && (
        <EditPostModal
          post={post}
          sections={sections}
          isOpen={isEditing}
          onClose={() => setIsEditing(false)}
          onPostUpdated={(updated) => {
            setIsEditing(false);
            onPostUpdated(updated);
          }}
        />
      )}
    </div>
  );
}
