'use client';

import React, { useState, useEffect } from 'react';
import { Board, User, MediaAttachment, Section } from '@/types';
import { AudioRecorder } from '@/components/media/AudioRecorder';
import { LinkPreviewCard } from '@/components/media/LinkPreviewCard';
import { extractYouTubeId, getYouTubeThumbnail, findUrls } from '@/lib/media';
import {
  X,
  Image as ImageIcon,
  Mic,
  Link as LinkIcon,
  Send,
  Loader2,
  AlertCircle,
  Info,
  Folder,
  UploadCloud,
  Volume2,
} from 'lucide-react';

interface CreatePostModalProps {
  board: Board;
  sections?: Section[];
  defaultSectionId?: string;
  initialAttachment?: MediaAttachment;
  initialMediaType?: 'none' | 'image' | 'audio' | 'link';
  currentUser: User | null;
  isOpen: boolean;
  onClose: () => void;
  onPostCreated: () => void;
}

const PASTEL_COLORS = [
  { name: '經典暖黃', value: '#fef08a' },
  { name: '活力櫻粉', value: '#fbcfe8' },
  { name: '清爽薄荷', value: '#bbf7d0' },
  { name: '晨曦晴空', value: '#bae6fd' },
  { name: '薰衣草紫', value: '#e9d5ff' },
  { name: '雪白簡約', value: '#ffffff' },
];

export function CreatePostModal({
  board,
  sections = [],
  defaultSectionId,
  initialAttachment,
  initialMediaType = 'none',
  currentUser,
  isOpen,
  onClose,
  onPostCreated,
}: CreatePostModalProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [authorName, setAuthorName] = useState(currentUser?.name || '');
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState('#fef08a');
  const [mediaType, setMediaType] = useState<'none' | 'image' | 'audio' | 'link'>(initialMediaType);
  const [attachment, setAttachment] = useState<MediaAttachment | undefined>(initialAttachment);
  const [linkInput, setLinkInput] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [loadingLinkPreview, setLoadingLinkPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setContent('');
      setLinkInput('');
      setError(null);
      setSelectedColor('#fef08a');
      setAttachment(initialAttachment);
      setMediaType(initialMediaType || (initialAttachment ? initialAttachment.type : 'none'));
      if (currentUser?.name) {
        setAuthorName(currentUser.name);
      }
      if (defaultSectionId) {
        setSelectedSectionId(defaultSectionId);
      } else if (sections.length > 0) {
        setSelectedSectionId(sections[0].id);
      }
    }
  }, [isOpen, defaultSectionId, sections, initialAttachment, initialMediaType, currentUser]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // 上傳圖片處理核心邏輯 (支援拖曳、剪貼簿與檔案選擇)
  const uploadImageFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('請選擇圖片檔案（支援 JPG、PNG、WebP、GIF 等）');
      return;
    }
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await uploadImageFile(file);
  };

  // 拖曳處理
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDraggingFile(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await uploadImageFile(files[0]);
    }
  };

  // 剪貼簿 Ctrl+V 貼上圖片
  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          await uploadImageFile(file);
          return;
        }
      }
    }
  };

  // 智慧網址辨識：解析 YouTube 或一般網址縮圖
  const parseAndApplyUrl = async (urlStr: string) => {
    const trimmed = urlStr.trim();
    if (!trimmed) return;

    // 1. 檢查是否為 YouTube
    const ytId = extractYouTubeId(trimmed);
    if (ytId) {
      setAttachment({
        type: 'link',
        url: trimmed,
        title: 'YouTube 影片',
        metadata: {
          youtubeId: ytId,
          ogImage: getYouTubeThumbnail(ytId),
        },
      });
      setMediaType('link');
      return;
    }

    // 2. 一般網址，向後端 /api/og 抓取 OpenGraph 資訊
    setLoadingLinkPreview(true);
    try {
      const res = await fetch(`/api/og?url=${encodeURIComponent(trimmed)}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setAttachment({
          type: 'link',
          url: trimmed,
          title: data.title || trimmed,
          metadata: {
            ogImage: data.image,
            ogTitle: data.title,
            ogDescription: data.description,
            favicon: data.favicon,
          },
        });
        setMediaType('link');
      } else {
        setAttachment({
          type: 'link',
          url: trimmed,
          title: trimmed,
        });
        setMediaType('link');
      }
    } catch {
      setAttachment({
        type: 'link',
        url: trimmed,
        title: trimmed,
      });
      setMediaType('link');
    } finally {
      setLoadingLinkPreview(false);
    }
  };

  // 當使用者在內容輸入框輸入時，若偵測到網址且無附件則自動抓取縮圖
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);

    if (!attachment || attachment.type === 'link') {
      const urls = findUrls(val);
      if (urls.length > 0 && urls[0] !== attachment?.url) {
        parseAndApplyUrl(urls[0]);
      }
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

  // 送出貼文
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser && (!authorName || !authorName.trim())) {
      setError('訪客發表請務必填寫您的姓名或座號暱稱！');
      return;
    }

    // 若尚未生成附件，嘗試從網址輸入框、內容或標題自動解析網址附件
    let finalAttachment = attachment;
    if (!finalAttachment) {
      const rawUrl = linkInput.trim() || findUrls(content)[0] || findUrls(title)[0];
      if (rawUrl) {
        const ytId = extractYouTubeId(rawUrl);
        if (ytId) {
          finalAttachment = {
            type: 'link',
            url: rawUrl,
            title: 'YouTube 影片',
            metadata: {
              youtubeId: ytId,
              ogImage: getYouTubeThumbnail(ytId),
            },
          };
        } else {
          finalAttachment = {
            type: 'link',
            url: rawUrl,
            title: rawUrl,
          };
        }
      }
    }

    if (!content.trim() && !title.trim() && !finalAttachment) {
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
          sectionId: selectedSectionId || undefined,
          title: title.trim(),
          content: content.trim(),
          authorName: currentUser ? currentUser.name : authorName.trim(),
          color: selectedColor,
          attachment: finalAttachment,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '發布失敗');
      }

      // 重設表單狀態
      setTitle('');
      setContent('');
      setLinkInput('');
      setAttachment(undefined);
      setMediaType('none');
      setError(null);

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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{ backgroundColor: selectedColor }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onPaste={handlePaste}
        className="rounded-3xl max-w-lg w-full max-h-[88vh] flex flex-col shadow-2xl border-2 border-black/20 overflow-hidden relative transition-colors duration-200"
      >
        {/* 拖曳照片提示覆蓋層 */}
        {isDraggingFile && (
          <div className="absolute inset-0 z-40 bg-amber-500/90 text-white flex flex-col items-center justify-center p-6 text-center backdrop-blur-xs border-4 border-dashed border-white rounded-3xl animate-pulse pointer-events-none">
            <UploadCloud className="w-16 h-16 mb-2" />
            <p className="text-lg font-black">放開滑鼠立即上傳照片 📸</p>
            <p className="text-xs text-white/90 mt-1">支援照片直接拖曳或剪貼簿 Ctrl+V 貼上</p>
          </div>
        )}

        {/* 固定頂部標頭 */}
        <div className="px-5 py-3.5 bg-black/5 border-b border-black/10 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-base font-black text-gray-950 tracking-tight leading-tight">
              新增分享便籤 📝
            </h3>
            <p className="text-[11px] text-gray-800 font-semibold truncate max-w-xs sm:max-w-sm">
              張貼至：<span className="font-extrabold">{board.title}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-700 hover:text-black hover:bg-black/10 active:bg-black/20 rounded-full transition"
            title="關閉視窗 (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 可滾動表單主體 */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto flex flex-col">
          <div className="p-5 space-y-4 flex-1">
            {/* 訪客提示 */}
            {!currentUser && (
              <div className="p-2.5 rounded-xl bg-blue-100 border border-blue-300 text-xs text-blue-950 font-bold flex items-center gap-2">
                <Info className="w-4 h-4 shrink-0 text-blue-700" />
                <span>您目前為訪客身分，發文後將無法編輯或刪除，請務必填妥暱稱。</span>
              </div>
            )}

            {/* 審核提示 */}
            {board.requireApproval && currentUser?.role !== 'teacher' && currentUser?.role !== 'admin' && (
              <div className="p-2.5 rounded-xl bg-amber-200/90 border border-amber-400 text-xs text-amber-950 font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-800" />
                <span>此看板已開啟課堂審核，送出後需經由老師批准才會公開。</span>
              </div>
            )}

            {error && (
              <div className="p-2.5 rounded-xl bg-red-100 border border-red-300 text-xs text-red-900 font-bold">
                {error}
              </div>
            )}

            {/* 主題分類選擇器 */}
            {sections.length > 0 && (
              <div>
                <label className="block text-xs font-black text-gray-950 mb-1 flex items-center gap-1">
                  <Folder className="w-3.5 h-3.5 text-amber-700" />
                  <span>發布主題分類 *</span>
                </label>
                <select
                  value={selectedSectionId}
                  onChange={(e) => setSelectedSectionId(e.target.value)}
                  className="w-full text-sm font-bold bg-white text-gray-950 border-2 border-gray-400 rounded-xl px-3.5 py-2.5 outline-hidden focus:border-amber-600 focus:ring-2 focus:ring-amber-200 shadow-xs"
                >
                  {sections.map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      {sec.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* 發文者姓名（未登入時必填） */}
            {!currentUser && (
              <div>
                <label className="block text-xs font-black text-gray-950 mb-1">
                  你的名字 / 座號暱稱 * (訪客必填)
                </label>
                <input
                  type="text"
                  required
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="例如：陳大明 05 或 課堂小偵探"
                  className="w-full text-sm font-bold bg-white text-gray-950 placeholder:text-gray-500 border-2 border-gray-400 rounded-xl px-3.5 py-2.5 outline-hidden focus:border-amber-600 focus:ring-2 focus:ring-amber-200 shadow-xs"
                />
              </div>
            )}

            {/* 標題 */}
            <div>
              <label className="block text-xs font-black text-gray-950 mb-1">
                卡片標題（選填）
              </label>
              <input
                type="text"
                placeholder="例如：操場邊發現的奇特植物..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full font-black text-base bg-white text-gray-950 placeholder:text-gray-500 border-2 border-gray-400 rounded-xl px-3.5 py-2.5 outline-hidden focus:border-amber-600 focus:ring-2 focus:ring-amber-200 shadow-xs"
              />
            </div>

            {/* 內文 */}
            <div>
              <label className="block text-xs font-black text-gray-950 mb-1">
                內容心得 *
              </label>
              <textarea
                rows={4}
                placeholder="寫下你的觀察、想法或心得，貼入網址將自動顯示縮圖..."
                value={content}
                onChange={handleContentChange}
                onPaste={(e) => {
                  const pasted = e.clipboardData.getData('text');
                  if (pasted) {
                    const urls = findUrls(pasted);
                    if (urls.length > 0 && (!attachment || attachment.type === 'link')) {
                      parseAndApplyUrl(urls[0]);
                    }
                  }
                }}
                className="w-full text-sm font-bold bg-white text-gray-950 placeholder:text-gray-500 border-2 border-gray-400 rounded-xl px-3.5 py-3 outline-hidden focus:border-amber-600 focus:ring-2 focus:ring-amber-200 shadow-xs resize-none"
              />
              <p className="text-[11px] text-gray-700 font-medium mt-1">
                💡 貼入 YouTube 影片或一般網頁連結，將自動偵測並呈現網址縮圖與可點擊連結！
              </p>
            </div>

            {/* 便籤顏色挑選 */}
            <div className="flex items-center gap-2 bg-white/60 p-2.5 rounded-2xl border border-black/10">
              <span className="text-xs font-black text-gray-950 mr-1">便籤顏色：</span>
              <div className="flex items-center gap-2">
                {PASTEL_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setSelectedColor(c.value)}
                    style={{ backgroundColor: c.value }}
                    className={`w-7 h-7 rounded-full border-2 transition-transform ${
                      selectedColor === c.value
                        ? 'scale-125 border-gray-950 ring-2 ring-amber-500 shadow-md'
                        : 'border-black/20 hover:scale-110'
                    }`}
                    title={c.name}
                  />
                ))}
              </div>
            </div>

            {/* 多媒體工具按鈕列 */}
            <div className="pt-2 border-t border-black/15 flex items-center justify-between">
              <div className="flex items-center gap-2 flex-wrap">
                {/* 圖片上傳按鈕 */}
                <label
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black cursor-pointer transition shadow-xs ${
                    mediaType === 'image'
                      ? 'bg-amber-600 text-white'
                      : 'bg-white hover:bg-gray-100 text-gray-900 border border-gray-300'
                  }`}
                >
                  <ImageIcon className="w-4 h-4" />
                  <span>{uploadingImage ? '上傳中...' : '拖曳/選擇照片'}</span>
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
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition shadow-xs ${
                    mediaType === 'audio'
                      ? 'bg-amber-600 text-white'
                      : 'bg-white hover:bg-gray-100 text-gray-900 border border-gray-300'
                  }`}
                >
                  <Mic className="w-4 h-4" />
                  <span>語音 (3分鐘)</span>
                </button>

                {/* 連結按鈕 */}
                <button
                  type="button"
                  onClick={() => setMediaType(mediaType === 'link' ? 'none' : 'link')}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition shadow-xs ${
                    mediaType === 'link'
                      ? 'bg-amber-600 text-white'
                      : 'bg-white hover:bg-gray-100 text-gray-900 border border-gray-300'
                  }`}
                >
                  <LinkIcon className="w-4 h-4" />
                  <span>連結/YouTube</span>
                </button>
              </div>
            </div>

            {/* 展開之錄音組件 */}
            {mediaType === 'audio' && (
              <AudioRecorder
                onAudioReady={handleAudioReady}
                onCancel={() => {
                  setMediaType('none');
                  setAttachment(undefined);
                }}
              />
            )}

            {/* 展開之網址輸入組件 */}
            {mediaType === 'link' && (
              <div className="bg-white p-3.5 rounded-2xl border-2 border-gray-300 space-y-2 shadow-xs">
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="貼上 YouTube 影片網址或網頁連結..."
                    value={linkInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setLinkInput(val);
                      const urls = findUrls(val);
                      if (urls.length > 0) {
                        parseAndApplyUrl(urls[0]);
                      } else if (val.trim().startsWith('http://') || val.trim().startsWith('https://')) {
                        parseAndApplyUrl(val.trim());
                      }
                    }}
                    onPaste={(e) => {
                      const pasted = e.clipboardData.getData('text');
                      if (pasted) {
                        const urls = findUrls(pasted);
                        if (urls.length > 0) {
                          parseAndApplyUrl(urls[0]);
                        } else if (pasted.trim().startsWith('http://') || pasted.trim().startsWith('https://')) {
                          parseAndApplyUrl(pasted.trim());
                        }
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        parseAndApplyUrl(linkInput);
                      }
                    }}
                    className="flex-1 text-xs font-bold bg-gray-50 border border-gray-300 rounded-lg px-2.5 py-2 outline-hidden focus:border-amber-600 text-gray-950"
                  />
                  <button
                    type="button"
                    onClick={() => parseAndApplyUrl(linkInput)}
                    disabled={loadingLinkPreview}
                    className="px-3.5 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-black shadow-xs flex items-center gap-1"
                  >
                    {loadingLinkPreview ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                    <span>{loadingLinkPreview ? '解析中...' : '解析縮圖'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-gray-600 font-medium">
                  💡 貼入 YouTube 連結可直接在便籤內播放，一般網址會自動抓取網頁縮圖！
                </p>
              </div>
            )}

            {/* 已加入的附件縮圖預覽狀態 */}
            {attachment && (
              <div className="space-y-2">
                <div className="text-xs font-black text-gray-900 flex items-center justify-between">
                  <span>多媒體附件預覽：</span>
                  <button
                    type="button"
                    onClick={() => {
                      setAttachment(undefined);
                      setMediaType('none');
                    }}
                    className="text-red-600 hover:text-red-800 text-xs font-bold"
                  >
                    移除附件
                  </button>
                </div>

                {attachment.type === 'link' && (
                  <LinkPreviewCard
                    attachment={attachment}
                    canRemove={true}
                    onRemove={() => {
                      setAttachment(undefined);
                      setMediaType('none');
                    }}
                  />
                )}

                {attachment.type === 'image' && (
                  <div className="rounded-2xl border-2 border-emerald-500 overflow-hidden bg-white shadow-xs relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={attachment.url} alt="照片" className="w-full max-h-56 object-cover" />
                    <div className="p-2.5 flex items-center justify-between bg-white/95 text-xs font-bold">
                      <span className="truncate text-emerald-900 flex items-center gap-1">
                        <ImageIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{attachment.title || '照片附件'}</span>
                      </span>
                    </div>
                  </div>
                )}

                {attachment.type === 'audio' && (
                  <div className="p-3 rounded-2xl bg-white border-2 border-amber-400 flex items-center justify-between shadow-xs">
                    <div className="flex items-center gap-2">
                      <Volume2 className="w-5 h-5 text-amber-600" />
                      <span className="text-xs font-bold text-gray-800">語音錄音檔已附加</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 底部固定操作欄 */}
          <div className="px-5 py-3 bg-black/5 border-t border-black/10 flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/90 hover:bg-white text-gray-800 text-xs font-bold transition shadow-xs"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={submitting || uploadingImage}
              className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-xs font-black shadow-xs transition disabled:opacity-50 flex items-center gap-1.5"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>發布中...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
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
