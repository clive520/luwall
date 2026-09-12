'use client';

import React, { useState } from 'react';
import { Board, User, MediaAttachment } from '@/types';
import { AudioRecorder } from '@/components/media/AudioRecorder';
import {
  X,
  Image as ImageIcon,
  Mic,
  Link as LinkIcon,
  Send,
  Loader2,
  AlertCircle,
  Info,
} from 'lucide-react';

interface CreatePostModalProps {
  board: Board;
  currentUser: User | null;
  isOpen: boolean;
  onClose: () => void;
  onPostCreated: () => void;
}

const PASTEL_COLORS = [
  { name: '經典黃', value: '#fef08a', border: 'border-yellow-300' },
  { name: '活力粉', value: '#fbcfe8', border: 'border-pink-300' },
  { name: '清爽綠', value: '#bbf7d0', border: 'border-green-300' },
  { name: '晨曦藍', value: '#bae6fd', border: 'border-sky-300' },
  { name: '溫柔紫', value: '#e9d5ff', border: 'border-purple-300' },
  { name: '純淨白', value: '#ffffff', border: 'border-gray-300' },
];

export function CreatePostModal({
  board,
  currentUser,
  isOpen,
  onClose,
  onPostCreated,
}: CreatePostModalProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [authorName, setAuthorName] = useState(currentUser?.name || '');
  const [selectedColor, setSelectedColor] = useState('#fef08a');
  const [mediaType, setMediaType] = useState<'none' | 'image' | 'audio' | 'link'>('none');
  const [attachment, setAttachment] = useState<MediaAttachment | undefined>(undefined);
  const [linkInput, setLinkInput] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // 上傳圖片處理
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('圖片大小不能超過 5MB');
      return;
    }

    setUploadingImage(true);
    setError(null);
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

      setAttachment({
        type: 'image',
        url: data.url,
        title: file.name,
      });
      setMediaType('image');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '上傳失敗';
      setError(msg);
    } finally {
      setUploadingImage(false);
    }
  };

  // 錄音完成回呼
  const handleAudioReady = (url: string, duration: number) => {
    setAttachment({
      type: 'audio',
      url,
      metadata: { duration },
    });
    setMediaType('audio');
  };

  // 外部連結設定
  const handleApplyLink = () => {
    if (!linkInput.trim()) return;
    setAttachment({
      type: 'link',
      url: linkInput.trim(),
      title: linkInput.trim(),
    });
    setMediaType('link');
  };

  // 送出貼文
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 訪客必須填入暱稱
    if (!currentUser && (!authorName || !authorName.trim())) {
      setError('訪客發表請務必填寫您的姓名或座號暱稱！');
      return;
    }

    if (!content.trim() && !title.trim() && !attachment) {
      setError('請至少輸入標題、內容或新增多媒體附件');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          boardId: board.id,
          title: title.trim(),
          content: content.trim(),
          authorName: currentUser ? currentUser.name : authorName.trim(),
          color: selectedColor,
          attachment,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '發布失敗');
      }

      onPostCreated();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '發布失敗';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
      <div
        style={{ backgroundColor: selectedColor }}
        className="rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-black/10 relative my-8 transition-colors duration-200"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-500 hover:text-gray-900 hover:bg-black/5 rounded-full transition"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-xl font-extrabold text-gray-950 mb-1">
          新增分享便籤 📝
        </h3>
        <p className="text-xs text-gray-600 mb-3">
          張貼至：<span className="font-semibold">{board.title}</span>
        </p>

        {/* 訪客身分提示 */}
        {!currentUser && (
          <div className="mb-3 p-2.5 rounded-xl bg-blue-100/70 border border-blue-200 text-xs text-blue-900 flex items-center gap-2">
            <Info className="w-4 h-4 shrink-0" />
            <span>您目前為訪客身分，發文後將無法編輯或刪除，請務必填妥暱稱。</span>
          </div>
        )}

        {/* 審核提示 */}
        {board.requireApproval && currentUser?.role !== 'teacher' && currentUser?.role !== 'admin' && (
          <div className="mb-3 p-2.5 rounded-xl bg-amber-200/60 border border-amber-300 text-xs text-amber-900 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>此看板已開啟課堂審核，送出後需經由老師批准才會公開。</span>
          </div>
        )}

        {error && (
          <div className="mb-3 p-2.5 rounded-xl bg-red-100 border border-red-300 text-xs text-red-800">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* 發文者姓名（未登入時必填） */}
          {!currentUser && (
            <div>
              <label className="block text-xs font-bold text-gray-800 mb-1">
                你的名字 / 座號暱稱 *
              </label>
              <input
                type="text"
                required
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="例如：陳大明 05 或 課堂小偵探"
                className="w-full text-sm bg-white/90 border border-black/10 rounded-xl px-3.5 py-2 outline-hidden focus:ring-2 focus:ring-amber-500/50"
              />
            </div>
          )}

          {/* 標題 */}
          <div>
            <input
              type="text"
              placeholder="給卡片取個小標題（選填）..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full font-bold text-base bg-white/80 border border-black/10 rounded-xl px-3.5 py-2 outline-hidden focus:ring-2 focus:ring-amber-500/50"
            />
          </div>

          {/* 內文 */}
          <div>
            <textarea
              rows={4}
              placeholder="寫下你的觀察、想法或心得..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full text-sm bg-white/80 border border-black/10 rounded-xl px-3.5 py-2.5 outline-hidden focus:ring-2 focus:ring-amber-500/50 resize-none font-medium text-gray-800"
            />
          </div>

          {/* 顏色挑選 */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-700 mr-1">便籤顏色：</span>
            {PASTEL_COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setSelectedColor(c.value)}
                style={{ backgroundColor: c.value }}
                className={`w-6 h-6 rounded-full border-2 transition-transform ${
                  selectedColor === c.value ? 'scale-125 border-gray-900 shadow-xs' : 'border-black/10'
                }`}
                title={c.name}
              />
            ))}
          </div>

          {/* 多媒體工具按鈕列 */}
          <div className="pt-2 border-t border-black/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* 圖片按鈕 */}
              <label
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition ${
                  mediaType === 'image'
                    ? 'bg-amber-600 text-white'
                    : 'bg-white/80 hover:bg-white text-gray-700'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>{uploadingImage ? '上傳中...' : '照片 (5MB)'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploadingImage}
                  className="hidden"
                />
              </label>

              {/* 錄音按鈕 */}
              <button
                type="button"
                onClick={() => setMediaType(mediaType === 'audio' ? 'none' : 'audio')}
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  mediaType === 'audio'
                    ? 'bg-amber-600 text-white'
                    : 'bg-white/80 hover:bg-white text-gray-700'
                }`}
              >
                <Mic className="w-3.5 h-3.5" />
                <span>語音 (3分鐘)</span>
              </button>

              {/* 連結按鈕 */}
              <button
                type="button"
                onClick={() => setMediaType(mediaType === 'link' ? 'none' : 'link')}
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  mediaType === 'link'
                    ? 'bg-amber-600 text-white'
                    : 'bg-white/80 hover:bg-white text-gray-700'
                }`}
              >
                <LinkIcon className="w-3.5 h-3.5" />
                <span>連結/YouTube</span>
              </button>
            </div>
          </div>

          {/* 展開之多媒體編輯器 */}
          {mediaType === 'audio' && (
            <AudioRecorder
              onAudioReady={handleAudioReady}
              onCancel={() => {
                setMediaType('none');
                setAttachment(undefined);
              }}
            />
          )}

          {mediaType === 'link' && (
            <div className="bg-white/90 p-3 rounded-2xl border border-black/10 space-y-2">
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="貼上 YouTube 影片網址或網頁連結..."
                  value={linkInput}
                  onChange={(e) => setLinkInput(e.target.value)}
                  className="flex-1 text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 outline-hidden"
                />
                <button
                  type="button"
                  onClick={handleApplyLink}
                  className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold"
                >
                  套用
                </button>
              </div>
              <p className="text-[10px] text-gray-500">
                💡 貼入 YouTube 連結可直接在便籤內播放影片！
              </p>
            </div>
          )}

          {/* 已加入的附件預覽狀態 */}
          {attachment && (
            <div className="p-2.5 rounded-xl bg-white/90 border border-black/10 flex items-center justify-between text-xs">
              <span className="font-semibold text-emerald-800 truncate">
                已附加：{attachment.type === 'image' ? '📸 照片' : attachment.type === 'audio' ? '🎙️ 錄音檔' : '🔗 外部連結'}
              </span>
              <button
                type="button"
                onClick={() => {
                  setAttachment(undefined);
                  setMediaType('none');
                }}
                className="text-red-500 hover:text-red-700 font-bold ml-2"
              >
                移除
              </button>
            </div>
          )}

          {/* 送出按鈕 */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting || uploadingImage}
              className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-2xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-extrabold shadow-md transition disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>發布中...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>貼到鹿鳴牆上 📌</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
